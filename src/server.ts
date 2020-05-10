import * as express from 'express'
import * as bodyParser from 'body-parser'

import { STO, getSTO, CachedData } from './sto'
import { options as OPT } from './index'
import { genRandom, genRandomNum } from './utils'

export const router = express.Router()

let _inited = false

router.route('/').get((req, res) => {
    res.status(202).json({
        err: false,
        info: 'CCHOOK API',
    })
})

router.route('/cchook').post(async (req, res) => {
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
        res.status(400).json({
            err: true,
            errMsg: 'missing user id in request',
        })
        return
    } else if (sto().user.list.lastIndexOf(userId) == -1) {
        res.status(400).json({
            err: true,
            errMsg: 'user not found',
        })
        return
    }
    delete _body['_cc_hook_user_id']
    const _data = new CachedData(userId, undefined, {
        body: _body,
        headers: _headers,
    })
    res.status(200).json({
        err: false,
        pending_id: _data.pendingId,
    })
})

router.route('/pending').post(async (req, res) => {
    const userId = req.body['_cc_hook_user_id']
    const offset = req.body['_cc_hook_offset'] || -1
    if (!userId) {
        res.status(400).json({
            err: true,
            errMsg: 'missing user id in request',
        })
        return
    }
    const pendingIds = sto().user.get(userId).pending
    const data = []
    for (const id of pendingIds) {
        if (id <= offset) {
            sto().user.get(userId).delCacheData(id)
            continue
        }
        const cachedData = new CachedData(userId, id)
        data.push({
            pending_id: cachedData.pendingId,
            data: await cachedData.encrypt(),
        })
    }
    res.status(200).json({
        err: false,
        datas: data,
    })
})

router
    .route('/user')
    .post(async (req, res) => {
        const alias = req.body['alias']
        if (!alias) {
            res.status(400).end()
            return
        }
        const id = sto().user.add(alias)
        res.status(200).json({
            err: false,
            user_id: id,
        })
    })
    .delete(async (req, res) => {})

const sto = (): STO => {
    if (_inited) {
        return getSTO()
    } else {
        const _sto = getSTO()
        const latestId = _sto.lastPendingId
        OPT.pendingId =
            (latestId !== 0 ? latestId : genRandomNum(10000, 50000)) + 1
        if (!OPT.password) {
            const passwd = genRandom(8).toUpperCase()
            OPT.password = passwd
            console.log(`Generate new password: ${passwd}`)
        }
        _inited = true
        return _sto
    }
}

export const server = () => {
    const app = express()

    app.use(bodyParser.json())
    app.use('/', router)

    app.listen(OPT.port, () => {
        console.log('CC-HOOK START ON:', OPT.port)
    })
}
