/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const shortid = require('shortid')

const newId = (options={}) => {
	const id = shortid.generate().replace(/-/g, 'r').replace(/_/g, '9')
	return options.short ? id.slice(0,-4) : id

}

const getDateUtc = (date) => {
	const now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
	return new Date(now_utc)
}

const addZero = nbr => ('0' + nbr).slice(-2)

const getTimestamp = (options={ short:true }) => {
	const d = getDateUtc(new Date())
	const main = `${d.getUTCFullYear()}${addZero(d.getUTCMonth()+1)}${addZero(d.getUTCDate())}`
	if (options.short)
		return main
	else 
		return `${main}-${addZero(d.getUTCHours())}${addZero(d.getUTCMinutes())}${addZero(d.getUTCSeconds())}`
}

const _objectSortBy = (obj, fn = x => x, dir='asc') => Object.keys(obj || {})
	.map(key => ({ key, value: obj[key] }))
	.sort((a,b) => {
		const vA = fn(a.value)
		const vB = fn(b.value)
		if (dir == 'asc') {
			if (vA < vB)
				return -1
			else if (vA > vB)
				return 1
			else
				return 0
		} else {
			if (vA > vB)
				return -1
			else if (vA < vB)
				return 1
			else
				return 0
		}
	}).reduce((acc,v) => {
		acc[v.key] = v.value
		return acc
	}, {})

const _arraySortBy = (arr, fn = x => x, dir='asc') => (arr || []).sort((a,b) => {
	const vA = fn(a)
	const vB = fn(b)
	if (dir == 'asc') {
		if (vA < vB)
			return -1
		else if (vA > vB)
			return 1
		else
			return 0
	} else {
		if (vA > vB)
			return -1
		else if (vA < vB)
			return 1
		else
			return 0
	}
})

const sortBy = (obj, fn = x => x, dir='asc') => Array.isArray(obj) ? _arraySortBy(obj, fn, dir) : _objectSortBy(obj, fn, dir)
const newSeed = (size=0) => Array.apply(null, Array(size))
const mergeObj = (...objs) => objs.reduce((acc, obj) => { //Object.assign(...objs.map(obj => JSON.parse(JSON.stringify(obj))))
	obj = obj || {}
	if (typeof(obj) != 'object' || Array.isArray(obj))
		throw new Error('Invalid argument exception. Merging objects only support object arguments. No arrays, primitive types, or non-truthy entities are allowed.')

	Object.keys(obj).forEach(property => {
		const val = obj[property]
		const originVal = acc[property]
		const readyToMerge = !originVal || !val || typeof(val) != 'object' || Array.isArray(val) || typeof(originVal) != 'object' || Array.isArray(originVal)
		acc[property] = readyToMerge ? val : mergeObj(originVal, val)	
	})

	return acc
}, {})

const isEmptyObj = obj => {
	if (!obj)
		return true 
	try {
		const o = JSON.stringify(obj)
		return o == '{}'
	} catch(e) {
		return (() => false)(e)
	}
}

const isObj = obj => {
	if (!obj || typeof(obj) != 'object')
		return false 

	try {
		const o = JSON.stringify(obj) || ''
		return o.match(/^\{(.*?)\}$/)
	} catch(e) {
		return (() => false)(e)
	}
}

const getDiff = (orig={}, current={}) => {
	return Object.keys(current).reduce((acc, key) => {
		const val = current[key]
		const origVal = orig[key]
		if (val == undefined || origVal == val) 
			return acc
		
		const origValIsObj = isObj(origVal)

		if (!origValIsObj && origVal != val) {
			acc[key] = val
			return acc
		} 

		const valIsObj = isObj(val)

		if (origValIsObj && valIsObj) {
			const objDiff = getDiff(origVal, val)
			if (!isEmptyObj(objDiff))
				acc[key] = objDiff
			return acc
		}

		if (origVal != val) {
			acc[key] = val
			return acc
		} 
		return acc
	}, {})
}

const objAreSame = (obj1, obj2) => {
	const o = getDiff(obj1, obj2)
	return Object.keys(o || {}).length == 0
}

const arrayObjAreDiff = (objArr_01, objArr_02) => {
	objArr_01 = objArr_01 || []
	objArr_02 = objArr_02 || []
	if (objArr_01.length != objArr_02.length)
		return false 
	return objArr_01.some(h1 => !objArr_02.some(h2 => objAreSame(h1, h2)))
}

const mergeCollection = (...collections) => {
	if (collections.length == 0)
		return []

	const lengths = collections.filter(col => col && col.length).map(col => col.length)
	if (lengths.length == 0)
		return collections
	
	const maxLength = Math.max(...collections.filter(col => col && col.length).map(col => col.length))

	return collections.map(col => {
		const l = (col || []).length
		if (l == 0) {
			return newSeed(maxLength)
		}
		if (l == maxLength)
			return col 

		const diff = maxLength - l
		return [...col, ...newSeed(diff)]
	})
}

/**
 * Breaks down an array in a collection of array of size 'batchSize'.
 * 
 * @param  {Array}  col       Initial collection (e.g. [1,2,3,4,5])
 * @param  {Number} batchSize Size of each batch (e.g. 2)
 * @return {Array}           collection of array of size 'batchSize' (e.g. [[1,2], [3,4], [5]]).
 */
const batch = (col, batchSize=1) => {
	const l = (col || []).length-1
	return l < 0 ? [] : col.reduce((acc,item,idx) => {
		acc.current.value.push(item)
		acc.current.size++
		if (acc.current.size == batchSize || idx == l) {
			acc.result.push(acc.current.value)
			acc.current = { value:[], size:0 }
		}
		return acc
	},{ result:[], current: { value:[], size:0 } }).result
}

const getRandomNumber = (start, end) => {
	const size = end == undefined ? start : (end - start)
	const offset = end == undefined ? 0 : start
	return offset + Math.floor(Math.random() * size)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           START CONVERTER                           	////////////////////////////////

/**
 * Convert snake case to camel case
 * @param  {String} s 	e.g., "hello_world"
 * @return {String}   	e.g., "helloWorld"
 */
const s2cCase = s => (s || '').replace(/\s/g, '').toLowerCase().split(/(?=_.{1})/g).reduce((result, part) => result + (result ? (part.slice(1,2).toUpperCase() + part.slice(2)) : part), '')

/**
 * Convert camel case to snake case
 * @param  {String} s 	e.g., "helloWorld"
 * @return {String}   	e.g., "hello_world"
 */
const c2sCase = s => (s || '').replace(/\s/g, '').split(/(?=[A-Z]{1})/g).map(x => x.toLowerCase()).join('_')

// Transforms { helloWorld: 'Nic' } to { hello_world: 'Nic' }
const objectC2Scase = obj => {
	if (!obj || typeof(obj) != 'object') 
		return obj 

	return Object.keys(obj).reduce((acc, key) => {
		const v = obj[key]
		const p = c2sCase(key)
		if (v && typeof(v) == 'object') {
			if (Array.isArray(v))
				acc[p] = v.map(x => objectC2Scase(x))
			else
				acc[p] = objectC2Scase(v)
		} else
			acc[p] = v 
		return acc
	}, {})
}

// Transforms { hello_world: 'Nic' } to { helloWorld: 'Nic' }
const objectS2Ccase = obj => {
	if (!obj || typeof(obj) != 'object') 
		return obj 

	return Object.keys(obj).reduce((acc, key) => {
		const v = obj[key]
		const p = s2cCase(key)
		if (v && typeof(v) == 'object') {
			if (Array.isArray(v))
				acc[p] = v.map(x => objectS2Ccase(x))
			else
				acc[p] = objectS2Ccase(v)
		} else
			acc[p] = v 
		return acc
	}, {})
}

const _supportedEncoding = { 'hex': true, 'utf8': true, 'base64': true, 'ascii': true, 'buffer': true }
// Examples: 
//	encoder('Hello').to('buffer')
//	encoder('Hello').to('base64')
//	encoder('Hello').to('base64')
const encoder = (obj, options) => {
	let { type } = options || {}
	type = type || 'utf8'
	const o = obj || ''
	const isString = typeof(o) == 'string'
	const isBuffer = o instanceof Buffer
	if (!isString && !isBuffer)
		throw new Error(`Wrong argument exception. The 'encoder' method only accept input of type 'string' or 'Buffer' (current: ${typeof(o)})`)
	if (!_supportedEncoding[type])
		throw new Error(`Wrong argument exception. The 'encoder' method only accept the following encoding types: 'hex', 'utf8', 'base64', 'buffer' and 'ascii' (current: ${type})`)
	return {
		to: encoding => {
			encoding = encoding || 'utf8'
			if (!_supportedEncoding[encoding])
				throw new Error(`Wrong argument exception. The 'encoder.to' method only accept the following encoding types: 'hex', 'utf8', 'base64', 'buffer' and 'ascii' (current: ${encoding})`)

			if (isString) {
				if (encoding == 'buffer')
					return o ? Buffer.from(o, type) : new Buffer(0)
				else
					return Buffer.from(o, type).toString(encoding)
			}
			else if (encoding == 'buffer')
				return o 
			else
				return o.toString(encoding)
		}
	}
}

//////////////////////////                           END CONVERTER	                            ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	identity: {
		'new': newId
	},
	date: {
		timestamp: getTimestamp
	},
	converter: {
		s2cCase,
		c2sCase,
		objectC2Scase,
		objectS2Ccase,
		encoder
	},
	collection: {
		batch,
		sortBy,
		seed: newSeed,
		merge: mergeCollection
	},
	obj: {
		merge: mergeObj,
		isEmpty: isEmptyObj,
		isObj,
		diff: getDiff,
		same: objAreSame,
		arrayAreDiff: arrayObjAreDiff
	},
	math: {
		randomNumber: getRandomNumber
	}
}