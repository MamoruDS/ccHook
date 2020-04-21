import * as crypto from 'crypto'

const algorithm = 'aes-192-cbc'

export const encrypt = async (
    text: string,
    password: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const key = crypto.scryptSync(password, 'salt', 24)
        const iv = Buffer.alloc(16, 0)
        const cipher = crypto.createCipheriv(algorithm, key, iv)
        let encrypted = ''
        cipher.on('readable', () => {
            let chunk: any
            while (null !== (chunk = cipher.read())) {
                encrypted += chunk.toString('hex')
            }
        })
        cipher.on('end', () => {
            resolve(encrypted)
        })
        cipher.write(text)
        cipher.end()
    })
}

export const decrypt = async (
    encrypted: string,
    password: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const key = crypto.scryptSync(password, 'salt', 24)
        const iv = Buffer.alloc(16, 0)
        const decipher = crypto.createDecipheriv(algorithm, key, iv)
        let decrypted = ''
        decipher.on('readable', () => {
            let chunk = undefined
            while (null !== (chunk = decipher.read())) {
                decrypted += chunk.toString('utf8')
            }
        })
        decipher.on('end', () => {
            resolve(decrypted)
        })
        decipher.write(encrypted, 'hex')
        decipher.end()
    })
}
