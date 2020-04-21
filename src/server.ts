import * as express from 'express'
import * as bodyParser from 'body-parser'

import * as sto from './sto'
import { options as OPT } from './index'

export const server = () => {
    const app = express()

    app.use(bodyParser.json())

    app.get('/health', (req, res) => {
        res.status(200).send()
        return
    })

    app.post('/cchook', async (req, res) => {
        const _headers = {}
        Object.keys(req.headers).map((key) => {
            _headers[key] = req.headers[key]
        })
        const _body = {}
        Object.keys(req.body).map((key) => {
            _body[key] = req.body[key]
        })
        const userId = _body['_cc_hook_user_id']
        if (!userId) {
            res.status(400).end()
            return
        }
        delete _body['_cc_hook_user_id']
        const _data = new sto.CachedData(userId, undefined, {
            body: _body,
            headers: _headers,
        })
        res.status(200).json({
            pending_id: _data.pendingId,
        })
    })

    app.post('/pending', async (req, res) => {
        const userId = req.body['_cc_hook_user_id']
        const offset = req.body['_cc_hook_offset'] || -1
        if (!userId) {
            res.status(400).end()
            return
        }
        const pendingIds = sto.getUserPending(userId)
        const data = []
        for (const id of pendingIds) {
            if (id <= offset) {
                sto.removeCacheData(userId, id)
                continue
            }
            const cachedData = new sto.CachedData(userId, id)
            data.push({
                pending_id: cachedData.pendingId,
                data: await cachedData.encrypt(),
            })
        }
        res.status(200).json({
            datas: data,
        })
    })

    app.post('/user', async (req, res) => {
        const alias = req.body['alias']
        if (!alias) {
            res.status(400).end()
            return
        }
        const id = sto.createUser(alias)
        res.json({
            user_id: id,
        })
    }).delete('/user', async (req, res) => {})

    app.listen(OPT.port, () => {
        console.log('CC-HOOK START ON:', OPT.port)
    })
}
