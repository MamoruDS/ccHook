import * as _ from 'lodash'

const idFormat = {
    ts_radix: 16,
    prefix_length_min: 1,
    prefix_length_max: 4,
    suffix_length_min: 10,
    suffix_length_max: 10,
    phrase_1_length: 6,
    phrase_2_length: 6,
    group_length: 10,
}

const regStr = `((^\\w{${idFormat.prefix_length_min},${idFormat.prefix_length_max}})-|^)((\\w{1,${idFormat.phrase_1_length}})-([A-F\\d]{1,})-(\\w{1,${idFormat.phrase_1_length}}))(-(\\w{${idFormat.suffix_length_min},${idFormat.suffix_length_max}})$|$)`

type IdInfo = {
    match: boolean
    body?: string
    ts?: number
    prefix?: string
    suffix?: string
}

export const parseId = (id: string): IdInfo => {
    let _res = { match: false } as IdInfo
    const _regex = new RegExp(regStr, 'gm').exec(id)
    if (_regex === null) return _res
    _res.match = true
    _res.body = _regex[3]
    _res.ts = parseInt(_regex[4], idFormat.ts_radix)
    _res.prefix = _regex[2]
    _res.suffix = _regex[8]
    return _res
}

export const genRandom = (length: number): string => {
    if (length < 1 || length > 10) {
        throw new RangeError()
    }
    return _.random(36 ** (length - 1), 36 ** length - 1).toString(36)
}

export const genRandomNum = (min: number, max: number) => {
    return _.random(min, max, false)
}

export const genId = (prefix?: string, suffix?: string) => {
    return `${prefix ? `${prefix}-` : ''}${genRandom(
        idFormat.phrase_1_length
    )}-${Date.now().toString(idFormat.ts_radix)}-${genRandom(
        idFormat.phrase_2_length
    )}${suffix ? `-${suffix}` : ''}`.toUpperCase()
}
