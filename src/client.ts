import { EventEmitter } from 'events'

import axios from 'axios'

import { options as OPT } from './index'
import { decrypt } from './encrypt'
import { RequestInfo } from './sto'
import { genRandom } from './utils'

export class CCHookClient extends EventEmitter {
    private readonly _user: string
    private readonly _passwd: string
    private readonly _addr: string
    private readonly _port: number
    private _offset: number
    private _timeout: number = 5000
    private _interval: number = 2000
    private _retryInterval: number = 60000
    private _connERRCount: number
    private _running: boolean = false
    private _tc: number
    private _ct: string
    private _nt: string
    private _action: EventEmitter

    constructor(
        options: {
            user?: string
            password?: string
            address?: string
            port?: number
        } = {}
    ) {
        super()
        this._user = options.user || OPT.user
        this._passwd = options.password || OPT.password
        this._addr = options.address || OPT.address
        this._port = options.port || OPT.port
        this._connERRCount = 0
        this._action = new EventEmitter()
    }

    private get _server(): string {
        return `${this._addr}:${this._port}`
    }
    get interval(): number {
        return this._interval
    }
    set interval(interval: number) {
        this._interval = interval
    }
    get timeout(): number {
        return this._timeout
    }
    set timeout(timeout: number) {
        this._timeout = timeout
    }
    get retryInterval(): number {
        return this._timeout
    }
    set retryInterval(interval: number) {
        this._retryInterval = interval
    }
    get action(): EventEmitter {
        return this._action
    }

    private async _getUpdates(token: string) {
        return new Promise((resolve, reject) => {
            const now = Date.now() as number
            this._tc = now
            this._ct = token
            const source = axios.CancelToken.source()
            setTimeout(() => {
                if (this._ct == token) {
                    source.cancel()
                    this._err(token)
                }
            }, this._timeout)
            axios({
                baseURL: this._server,
                url: 'pending',
                method: 'POST',
                timeout: this._timeout,
                data: {
                    _cc_hook_user_id: this._user,
                    _cc_hook_offset: this._offset,
                },
            })
                .then(async (res) => {
                    this._ct = undefined
                    this._connERRCount = 0
                    const _datas: {
                        pending_id: number
                        data: string
                    }[] = res['data']['datas'] || []
                    this._offset = -1
                    for (const _data of _datas) {
                        const pendingId = _data['pending_id']
                        if (this._offset < pendingId) this._offset = pendingId
                        await this._onUpdate(_data['data'])
                    }
                    this._next(token, undefined, 'from then')
                    resolve()
                })
                .catch((err) => {
                    if (this._err(token, err)) {
                        reject(err)
                    }
                    return
                })
        })
    }
    private _err(token: string, err = { code: 'ETIMEDOUT' }): boolean {
        this._ct = undefined
        let _interval = this._interval
        let _throw = true
        if (err.code == 'ECONNREFUSED' || err.code == 'ETIMEDOUT') {
            if (this._connERRCount >= 10) {
                _interval = this._retryInterval
            } else {
                _throw = false
            }

            this._connERRCount++
        }
        this._next(token, _interval, 'from error')
        return _throw
    }
    private _next(token: string, interval?: number, comment?: string): void {
        if (!this._running) return
        if (!interval) interval = this._interval
        const nt = genRandom(4).toUpperCase()
        this._nt = nt
        setTimeout(() => {
            if (this._nt == nt) {
                this._getUpdates(nt)
            } else {
                //
            }
        }, interval)
    }
    private async _onUpdate(data: string): Promise<void> {
        try {
            const decrypted = await decrypt(data, this._passwd)
            const cacheData = JSON.parse(decrypted) as {
                request: RequestInfo
            }
            this.emit('request', cacheData)
            const action = cacheData.request.body['_cc_hook_action_name']
            if (typeof action == 'string') {
                this._action.emit(action, cacheData)
            }
        } catch (err) {
            //
        }
    }
    start(): void {
        this._running = true
        this._getUpdates('INIT')
    }
    stop(): void {
        this._running = false
    }
}
