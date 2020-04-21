import { EventEmitter } from 'events'

import axios from 'axios'

import { options as OPT } from './index'
import { decrypt } from './encrypt'
import { RequestInfo } from './sto'

export class CCHookClient extends EventEmitter {
    private readonly _user: string
    private readonly _passwd: string
    private readonly _addr: string
    private readonly _port: number
    private _offset: number
    private _interval: number = 2000
    private _running: boolean = false

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

    private async _getUpdates() {
        return new Promise((resolve, reject) => {
            axios({
                baseURL: this._server,
                url: 'pending',
                method: 'POST',
                data: {
                    _cc_hook_user_id: this._user,
                    _cc_hook_offset: this._offset,
                },
            })
                .catch((err) => {
                    reject(err)
                })
                .then(async (res) => {
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
                    if (this._running) {
                        setTimeout(() => {
                            this._getUpdates()
                        }, this._interval)
                    }
                })
        })
    }
    private async _onUpdate(data: string): Promise<void> {
        try {
            const decrypted = await decrypt(data, this._passwd)
            const cacheData = JSON.parse(decrypted) as {
                request: RequestInfo
            }
            this.emit('request', cacheData)
        } catch (err) {
            //
        }
    }
    start(): void {
        this._running = true
        this._getUpdates()
    }
    stop(): void {
        this._running = false
    }
}
