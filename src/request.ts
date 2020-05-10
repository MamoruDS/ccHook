import * as http from 'http'
import * as https from 'https'
import axios from 'axios'

const source = axios.CancelToken.source()
const instance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
})

export { instance as axios, source }
