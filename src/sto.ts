import * as path from 'path'

import * as lowdb from 'lowdb'
import * as FileSync from 'lowdb/adapters/FileSync'
import * as _ from 'lodash'

import * as utils from './utils'
import { encrypt } from './encrypt'
import { options as OPT } from './index'

const CACHE_DIR = '.'
const CACHE_PATH = path.join(CACHE_DIR, 'cache.json')

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

interface CacheData {
    request: RequestInfo
    verify_token: string
}

export type RequestInfo = {
    headers: {
        [key: string]: string
    }
    body: {
        [key: string]: string | number | boolean | null
    }
}

class Users {
    private _sto: STO
    constructor(sto: STO) {
        this._sto = sto
    }

    get list(): string[] {
        const _user = this._sto.get(['USER']).value()
        if (_user === null) {
            return []
        }
        return Object.keys(_user)
    }
    get length(): number {
        return this.list.length
    }

    get(id: string): User {
        return new User(id, this._sto)
    }
    add(alias: string): string {
        const id = utils.genId('USER')
        this._sto.set(['USER', id, 'ALIAS'], alias).write()
        return id
    }
    delete(id: string) {
        this._sto.set([id]).write()
    }
}

class User {
    public id: string
    private _sto: STO

    constructor(id: string, sto: STO) {
        this.id = id
        this._sto = sto
    }

    get pending(): number[] {
        const p = this._sto.get(['USER', this.id, 'DATA']).value()
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

    getCacheData(pendingId: number): CacheData {
        try {
            return JSON.parse(
                this._sto.get(['USER', this.id, 'DATA', `${pendingId}`]).value()
            ) as CacheData
        } catch (err) {
            if (err instanceof SyntaxError) return undefined
        }
    }
    setCacheData(pendingId: number, data?: CacheData): void {
        this._sto
            .set(
                ['USER', this.id, 'DATA', `${pendingId}`],
                JSON.stringify(data)
            )
            .write()
    }
    delCacheData(pendingId: number): void {
        this._sto.set(['USER', this.id, 'DATA', `${pendingId}`]).write()
    }
}

class STO {
    private _db
    private _users: Users

    constructor() {
        const adapter = new FileSync(CACHE_PATH)
        this._db = lowdb(adapter)
        this._db.defaults({ USER: {} }).write()
        this._users = new Users(this)
    }

    get user(): Users {
        return this._users
    }
    get lastPendingId(): number {
        const users = this._users.list
        let latestId = 0
        for (const userId of users) {
            const user = new User(userId, this)
            const pendingIds = user.pending
            for (const id of pendingIds) {
                latestId = id > latestId ? id : latestId
            }
        }
        return latestId
    }

    get(path: string[]) {
        return this._db.get(parseDBPath(path))
    }
    set(path: string[], data?: any) {
        if (typeof data === 'undefined') {
            return this._db.unset(parseDBPath(path))
        }
        return this._db.set(parseDBPath(path), data)
    }
}

export class CachedData {
    private readonly _userId: string
    private readonly _pendingId: number
    private readonly _requestInfo: RequestInfo
    private readonly _verifyKey: string

    constructor(userId: string, pendindId?: number, reqInfo?: RequestInfo) {
        this._userId = userId
        this._pendingId = pendindId || OPT.pendingId
        OPT.pendingId++
        const sto = getSTO()
        const _data = sto.user.get(this._userId).getCacheData(this._pendingId)
        if (_data) {
            this._requestInfo = _data.request
            this._verifyKey = _data.verify_token
        } else {
            this._requestInfo = reqInfo
            this._verifyKey = utils.genRandom(6).toUpperCase()
            sto.user.get(this._userId).setCacheData(this._pendingId, {
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
        sto.user.get(this._userId).delCacheData(this._pendingId)
    }
}

let sto: STO = undefined
export const getSTO = (): STO => {
    if (typeof sto === 'undefined') {
        sto = new STO()
    }
    return sto
}
