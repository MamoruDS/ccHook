import yargs = require('yargs')
import { genRandom, genRandomNum } from './utils'
import { getLatestPendingId, createUser } from './sto'

const argv = yargs.options({
    addUser: { type: 'string' },
    server: { type: 'boolean' },
    password: { type: 'string', default: genRandom(6).toUpperCase() },
    address: { type: 'string' },
    port: { type: 'number', default: 8030 },
}).argv

export const options = {} as {
    password: string
    user: string
    address: string
    port: number
    pendingId: number
}

options.password = argv.password || process.env.CC_PASSWORD
options.address = argv.address || process.env.CC_SERVER_ADDR
options.port = argv.port || parseInt(process.env.CC_PORT)

import { server as _server } from './server'
export { CCHookClient as Client } from './client'

const main = () => {
    const latestId = getLatestPendingId()
    options.pendingId = latestId !== 0 ? latestId : genRandomNum(10000, 50000)

    if (argv.addUser) {
        const alias = argv.addUser
        const id = createUser(alias)
        console.log(`Added new user '${alias}' with ID:${id}`)
    }
    if (argv.server) {
        _server()
    }
}

main()
