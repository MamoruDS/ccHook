import yargs = require('yargs')
import { genRandom, genRandomNum } from './utils'
import { getLatestPendingId } from './sto'

const argv = yargs.options({
    server: { type: 'boolean', default: true },
    password: { type: 'string', default: genRandom(6).toUpperCase() },
    botToken: { type: 'string' },
    chatId: { type: 'number' },
    port: { type: 'number', default: 8030 },
}).argv

export const options = {} as {
    password: string
    botToken: string
    chatId: number | string
    port: number | string
    pendingId: number
}

options.password = argv.password || process.env.CC_PASSWORD
options.botToken = argv.botToken || process.env.CC_BOTTOKEN
options.chatId = argv.chatId || process.env.CC_CHATID
options.port = argv.port || process.env.CC_PORT

import { server as _server } from './server'
export { client } from './client'

const main = () => {
    const latestId = getLatestPendingId()
    options.pendingId = latestId !== 0 ? latestId : genRandomNum(10000, 50000)

    if (argv.server) {
        if (!options.chatId || !options.botToken) {
        } else {
            _server()
        }
    }
}

main()
