import * as fs from 'fs'
import * as path from 'path'

import * as lowdb from 'lowdb'
import * as FileSync from 'lowdb/adapters/FileSync'
import * as _ from 'lodash'

import * as utils from './utils'
import { encrypt, decrypt } from './encrypt'
import { options as OPT } from './index'

const CACHE_DIR = './cache'
const CACHE_PATH = path.join(CACHE_DIR, 'cache.json')

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR)
}

if (!fs.statSync(CACHE_DIR).isDirectory()) {
    process.exit(1)
}

const adapter = new FileSync(CACHE_PATH)
const db = lowdb(adapter)

db.defaults({ USER: {} }).write()

const parseDBPath = (path: string[]) => {
    return path
        .map((p) => {
            if (!Number.isNaN(parseInt(p))) {
                p = `_${p}`
            }
            return p
        })
        .join('.')
}

const get = (path: string[]) => {
    return db.get(parseDBPath(path))
}

const set = (path: string[], data?: any) => {
    if (typeof data === 'undefined') {
        return db.unset(parseDBPath(path))
    }
    return db.set(parseDBPath(path), data)
}

interface CacheData {
    request: RequestInfo
    verify_token: string
}

export type RequestInfo = {
    headers: {
        [key: string]: string
    }
    body: {
        [key: string]: string
    }
}

const getUsers = (): string[] => {
    const _user = get(['USER']).value()
    if (_user === null) {
        return []
    }
    return Object.keys(_user)
}

export const createUser = (alias: string): string => {
    const id = utils.genId('USER')
    set(['USER', id, 'ALIAS'], alias).write()
    return id
}

export const getUserPending = (user: string): number[] => {
    const p = get(['USER', user, 'DATA']).value()
    if (p) {
        const ids = []
        for (let id of Object.keys(p)) {
            const regex = new RegExp(/_(\d{1,})/, 'g')
            const res = regex.exec(id)
            if (res !== null) {
                ids.push(parseInt(res[1]))
            } else {
                ids.push(id)
            }
        }
        return ids
    }
    return []
}

export const removeUser = (user: string) => {
    set([user]).write()
}

const getCacheData = (user: string, id: number): CacheData => {
    try {
        return JSON.parse(
            get(['USER', user, 'DATA', `${id}`]).value()
        ) as CacheData
    } catch (err) {
        if (err instanceof SyntaxError) return undefined
    }
}

const setCacheData = (user: string, id: number, data?: CacheData): void => {
    set(['USER', user, 'DATA', `${id}`], JSON.stringify(data)).write()
}

export const removeCacheData = (user: string, id: number) => {
    set(['USER', user, 'DATA', `${id}`]).write()
}

export const getLatestPendingId = (): number => {
    const users = getUsers()
    let latestId = 0
    for (const user of users) {
        const pendingIds = getUserPending(user)
        for (const id of pendingIds) {
            latestId = id > latestId ? id : latestId
        }
    }
    return latestId
}

export class CachedData {
    private readonly _user: string
    private readonly _pendingId: number
    private readonly _requestInfo: RequestInfo
    private readonly _verifyKey: string

    constructor(user: string, pendindId?: number, reqInfo?: RequestInfo) {
        this._user = user
        this._pendingId = pendindId || OPT.pendingId
        OPT.pendingId++
        const _data = getCacheData(user, this._pendingId)
        if (_data) {
            this._requestInfo = _data.request
            this._verifyKey = _data.verify_token
        } else {
            this._requestInfo = reqInfo
            this._verifyKey = utils.genRandom(6).toUpperCase()
            setCacheData(this._user, this._pendingId, {
                verify_token: this._verifyKey,
                request: this._requestInfo,
            })
        }
    }

    get pendingId(): number {
        return this._pendingId
    }
    get requestInfo(): RequestInfo {
        return this._requestInfo
    }
    get verifyKey(): string {
        return this._verifyKey
    }
    private get _cacheData(): CacheData {
        return {
            // verify_token: this._verifyKey,
            request: this._requestInfo,
        } as CacheData
    }

    async encrypt(): Promise<string> {
        return await encrypt(JSON.stringify(this._cacheData), OPT.password)
    }
    clean() {
        setCacheData(this._user, this._pendingId)
    }
}

export const dataDecrypt = async (encrypted: string): Promise<CacheData> => {
    const _str = await decrypt(encrypted, OPT.password)
    return JSON.parse(_str) as CacheData
}
