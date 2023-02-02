var buffer = {};

var base64Js = {};

base64Js.byteLength = byteLength;
base64Js.toByteArray = toByteArray;
base64Js.fromByteArray = fromByteArray;

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function getLens (b64) {
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=');
  if (validLen === -1) validLen = len;

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4);

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

  var curByte = 0;

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen;

  var i;
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)];
    arr[curByte++] = (tmp >> 16) & 0xFF;
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    );
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    );
  }

  return parts.join('')
}

var ieee754 = {};

/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
};

ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

(function (exports) {

	const base64 = base64Js;
	const ieee754$1 = ieee754;
	const customInspectSymbol =
	  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
	    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
	    : null;

	exports.Buffer = Buffer;
	exports.SlowBuffer = SlowBuffer;
	exports.INSPECT_MAX_BYTES = 50;

	const K_MAX_LENGTH = 0x7fffffff;
	exports.kMaxLength = K_MAX_LENGTH;

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
	 *               implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * We report that the browser does not support typed arrays if the are not subclassable
	 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
	 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
	 * for __proto__ and has a buggy typed array implementation.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

	if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
	    typeof console.error === 'function') {
	  console.error(
	    'This browser lacks typed array (Uint8Array) support which is required by ' +
	    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
	  );
	}

	function typedArraySupport () {
	  // Can typed array instances can be augmented?
	  try {
	    const arr = new Uint8Array(1);
	    const proto = { foo: function () { return 42 } };
	    Object.setPrototypeOf(proto, Uint8Array.prototype);
	    Object.setPrototypeOf(arr, proto);
	    return arr.foo() === 42
	  } catch (e) {
	    return false
	  }
	}

	Object.defineProperty(Buffer.prototype, 'parent', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.buffer
	  }
	});

	Object.defineProperty(Buffer.prototype, 'offset', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.byteOffset
	  }
	});

	function createBuffer (length) {
	  if (length > K_MAX_LENGTH) {
	    throw new RangeError('The value "' + length + '" is invalid for option "size"')
	  }
	  // Return an augmented `Uint8Array` instance
	  const buf = new Uint8Array(length);
	  Object.setPrototypeOf(buf, Buffer.prototype);
	  return buf
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new TypeError(
	        'The "string" argument must be of type string. Received type number'
	      )
	    }
	    return allocUnsafe(arg)
	  }
	  return from(arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192; // not used by this implementation

	function from (value, encodingOrOffset, length) {
	  if (typeof value === 'string') {
	    return fromString(value, encodingOrOffset)
	  }

	  if (ArrayBuffer.isView(value)) {
	    return fromArrayView(value)
	  }

	  if (value == null) {
	    throw new TypeError(
	      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	      'or Array-like Object. Received type ' + (typeof value)
	    )
	  }

	  if (isInstance(value, ArrayBuffer) ||
	      (value && isInstance(value.buffer, ArrayBuffer))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof SharedArrayBuffer !== 'undefined' &&
	      (isInstance(value, SharedArrayBuffer) ||
	      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof value === 'number') {
	    throw new TypeError(
	      'The "value" argument must not be of type number. Received type number'
	    )
	  }

	  const valueOf = value.valueOf && value.valueOf();
	  if (valueOf != null && valueOf !== value) {
	    return Buffer.from(valueOf, encodingOrOffset, length)
	  }

	  const b = fromObject(value);
	  if (b) return b

	  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
	      typeof value[Symbol.toPrimitive] === 'function') {
	    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
	  }

	  throw new TypeError(
	    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	    'or Array-like Object. Received type ' + (typeof value)
	  )
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(value, encodingOrOffset, length)
	};

	// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
	// https://github.com/feross/buffer/pull/148
	Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
	Object.setPrototypeOf(Buffer, Uint8Array);

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be of type number')
	  } else if (size < 0) {
	    throw new RangeError('The value "' + size + '" is invalid for option "size"')
	  }
	}

	function alloc (size, fill, encoding) {
	  assertSize(size);
	  if (size <= 0) {
	    return createBuffer(size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpreted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(size).fill(fill, encoding)
	      : createBuffer(size).fill(fill)
	  }
	  return createBuffer(size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(size, fill, encoding)
	};

	function allocUnsafe (size) {
	  assertSize(size);
	  return createBuffer(size < 0 ? 0 : checked(size) | 0)
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(size)
	};
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(size)
	};

	function fromString (string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8';
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('Unknown encoding: ' + encoding)
	  }

	  const length = byteLength(string, encoding) | 0;
	  let buf = createBuffer(length);

	  const actual = buf.write(string, encoding);

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    buf = buf.slice(0, actual);
	  }

	  return buf
	}

	function fromArrayLike (array) {
	  const length = array.length < 0 ? 0 : checked(array.length) | 0;
	  const buf = createBuffer(length);
	  for (let i = 0; i < length; i += 1) {
	    buf[i] = array[i] & 255;
	  }
	  return buf
	}

	function fromArrayView (arrayView) {
	  if (isInstance(arrayView, Uint8Array)) {
	    const copy = new Uint8Array(arrayView);
	    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
	  }
	  return fromArrayLike(arrayView)
	}

	function fromArrayBuffer (array, byteOffset, length) {
	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('"offset" is outside of buffer bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('"length" is outside of buffer bounds')
	  }

	  let buf;
	  if (byteOffset === undefined && length === undefined) {
	    buf = new Uint8Array(array);
	  } else if (length === undefined) {
	    buf = new Uint8Array(array, byteOffset);
	  } else {
	    buf = new Uint8Array(array, byteOffset, length);
	  }

	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(buf, Buffer.prototype);

	  return buf
	}

	function fromObject (obj) {
	  if (Buffer.isBuffer(obj)) {
	    const len = checked(obj.length) | 0;
	    const buf = createBuffer(len);

	    if (buf.length === 0) {
	      return buf
	    }

	    obj.copy(buf, 0, 0, len);
	    return buf
	  }

	  if (obj.length !== undefined) {
	    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
	      return createBuffer(0)
	    }
	    return fromArrayLike(obj)
	  }

	  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
	    return fromArrayLike(obj.data)
	  }
	}

	function checked (length) {
	  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= K_MAX_LENGTH) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0;
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return b != null && b._isBuffer === true &&
	    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
	};

	Buffer.compare = function compare (a, b) {
	  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
	  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError(
	      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
	    )
	  }

	  if (a === b) return 0

	  let x = a.length;
	  let y = b.length;

	  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	};

	Buffer.concat = function concat (list, length) {
	  if (!Array.isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  let i;
	  if (length === undefined) {
	    length = 0;
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length;
	    }
	  }

	  const buffer = Buffer.allocUnsafe(length);
	  let pos = 0;
	  for (i = 0; i < list.length; ++i) {
	    let buf = list[i];
	    if (isInstance(buf, Uint8Array)) {
	      if (pos + buf.length > buffer.length) {
	        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
	        buf.copy(buffer, pos);
	      } else {
	        Uint8Array.prototype.set.call(
	          buffer,
	          buf,
	          pos
	        );
	      }
	    } else if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    } else {
	      buf.copy(buffer, pos);
	    }
	    pos += buf.length;
	  }
	  return buffer
	};

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    throw new TypeError(
	      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
	      'Received type ' + typeof string
	    )
	  }

	  const len = string.length;
	  const mustMatch = (arguments.length > 2 && arguments[2] === true);
	  if (!mustMatch && len === 0) return 0

	  // Use a for loop to avoid recursion
	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) {
	          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
	        }
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	}
	Buffer.byteLength = byteLength;

	function slowToString (encoding, start, end) {
	  let loweredCase = false;

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0;
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length;
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0;
	  start >>>= 0;

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8';

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase();
	        loweredCase = true;
	    }
	  }
	}

	// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
	// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
	// reliably in a browserify context because there could be multiple different
	// copies of the 'buffer' package in use. This method works even for Buffer
	// instances that were created from another copy of the `buffer` package.
	// See: https://github.com/feross/buffer/issues/154
	Buffer.prototype._isBuffer = true;

	function swap (b, n, m) {
	  const i = b[n];
	  b[n] = b[m];
	  b[m] = i;
	}

	Buffer.prototype.swap16 = function swap16 () {
	  const len = this.length;
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (let i = 0; i < len; i += 2) {
	    swap(this, i, i + 1);
	  }
	  return this
	};

	Buffer.prototype.swap32 = function swap32 () {
	  const len = this.length;
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (let i = 0; i < len; i += 4) {
	    swap(this, i, i + 3);
	    swap(this, i + 1, i + 2);
	  }
	  return this
	};

	Buffer.prototype.swap64 = function swap64 () {
	  const len = this.length;
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (let i = 0; i < len; i += 8) {
	    swap(this, i, i + 7);
	    swap(this, i + 1, i + 6);
	    swap(this, i + 2, i + 5);
	    swap(this, i + 3, i + 4);
	  }
	  return this
	};

	Buffer.prototype.toString = function toString () {
	  const length = this.length;
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	};

	Buffer.prototype.toLocaleString = Buffer.prototype.toString;

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	};

	Buffer.prototype.inspect = function inspect () {
	  let str = '';
	  const max = exports.INSPECT_MAX_BYTES;
	  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
	  if (this.length > max) str += ' ... ';
	  return '<Buffer ' + str + '>'
	};
	if (customInspectSymbol) {
	  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (isInstance(target, Uint8Array)) {
	    target = Buffer.from(target, target.offset, target.byteLength);
	  }
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError(
	      'The "target" argument must be one of type Buffer or Uint8Array. ' +
	      'Received type ' + (typeof target)
	    )
	  }

	  if (start === undefined) {
	    start = 0;
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0;
	  }
	  if (thisStart === undefined) {
	    thisStart = 0;
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length;
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0;
	  end >>>= 0;
	  thisStart >>>= 0;
	  thisEnd >>>= 0;

	  if (this === target) return 0

	  let x = thisEnd - thisStart;
	  let y = end - start;
	  const len = Math.min(x, y);

	  const thisCopy = this.slice(thisStart, thisEnd);
	  const targetCopy = target.slice(start, end);

	  for (let i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i];
	      y = targetCopy[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset;
	    byteOffset = 0;
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff;
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000;
	  }
	  byteOffset = +byteOffset; // Coerce to Number.
	  if (numberIsNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1);
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1;
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0;
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding);
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF; // Search for a byte value [0-255]
	    if (typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  let indexSize = 1;
	  let arrLength = arr.length;
	  let valLength = val.length;

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase();
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2;
	      arrLength /= 2;
	      valLength /= 2;
	      byteOffset /= 2;
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  let i;
	  if (dir) {
	    let foundIndex = -1;
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i;
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex;
	        foundIndex = -1;
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
	    for (i = byteOffset; i >= 0; i--) {
	      let found = true;
	      for (let j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false;
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	};

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	};

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	};

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0;
	  const remaining = buf.length - offset;
	  if (!length) {
	    length = remaining;
	  } else {
	    length = Number(length);
	    if (length > remaining) {
	      length = remaining;
	    }
	  }

	  const strLen = string.length;

	  if (length > strLen / 2) {
	    length = strLen / 2;
	  }
	  let i;
	  for (i = 0; i < length; ++i) {
	    const parsed = parseInt(string.substr(i * 2, 2), 16);
	    if (numberIsNaN(parsed)) return i
	    buf[offset + i] = parsed;
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8';
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset;
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset >>> 0;
	    if (isFinite(length)) {
	      length = length >>> 0;
	      if (encoding === undefined) encoding = 'utf8';
	    } else {
	      encoding = length;
	      length = undefined;
	    }
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  const remaining = this.length - offset;
	  if (length === undefined || length > remaining) length = remaining;

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8';

	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return asciiWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	};

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	};

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end);
	  const res = [];

	  let i = start;
	  while (i < end) {
	    const firstByte = buf[i];
	    let codePoint = null;
	    let bytesPerSequence = (firstByte > 0xEF)
	      ? 4
	      : (firstByte > 0xDF)
	          ? 3
	          : (firstByte > 0xBF)
	              ? 2
	              : 1;

	    if (i + bytesPerSequence <= end) {
	      let secondByte, thirdByte, fourthByte, tempCodePoint;

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte;
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1];
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          fourthByte = buf[i + 3];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint;
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD;
	      bytesPerSequence = 1;
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000;
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
	      codePoint = 0xDC00 | codePoint & 0x3FF;
	    }

	    res.push(codePoint);
	    i += bytesPerSequence;
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	const MAX_ARGUMENTS_LENGTH = 0x1000;

	function decodeCodePointsArray (codePoints) {
	  const len = codePoints.length;
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  let res = '';
	  let i = 0;
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    );
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F);
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i]);
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  const len = buf.length;

	  if (!start || start < 0) start = 0;
	  if (!end || end < 0 || end > len) end = len;

	  let out = '';
	  for (let i = start; i < end; ++i) {
	    out += hexSliceLookupTable[buf[i]];
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  const bytes = buf.slice(start, end);
	  let res = '';
	  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
	  for (let i = 0; i < bytes.length - 1; i += 2) {
	    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  const len = this.length;
	  start = ~~start;
	  end = end === undefined ? len : ~~end;

	  if (start < 0) {
	    start += len;
	    if (start < 0) start = 0;
	  } else if (start > len) {
	    start = len;
	  }

	  if (end < 0) {
	    end += len;
	    if (end < 0) end = 0;
	  } else if (end > len) {
	    end = len;
	  }

	  if (end < start) end = start;

	  const newBuf = this.subarray(start, end);
	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(newBuf, Buffer.prototype);

	  return newBuf
	};

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUintLE =
	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUintBE =
	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length);
	  }

	  let val = this[offset + --byteLength];
	  let mul = 1;
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUint8 =
	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  return this[offset]
	};

	Buffer.prototype.readUint16LE =
	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return this[offset] | (this[offset + 1] << 8)
	};

	Buffer.prototype.readUint16BE =
	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return (this[offset] << 8) | this[offset + 1]
	};

	Buffer.prototype.readUint32LE =
	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	};

	Buffer.prototype.readUint32BE =
	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	};

	Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const lo = first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24;

	  const hi = this[++offset] +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    last * 2 ** 24;

	  return BigInt(lo) + (BigInt(hi) << BigInt(32))
	});

	Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const hi = first * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  const lo = this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last;

	  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
	});

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let i = byteLength;
	  let mul = 1;
	  let val = this[offset + --i];
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	};

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset] | (this[offset + 1] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset + 1] | (this[offset] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	};

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	};

	Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = this[offset + 4] +
	    this[offset + 5] * 2 ** 8 +
	    this[offset + 6] * 2 ** 16 +
	    (last << 24); // Overflow

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24)
	});

	Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = (first << 24) + // Overflow
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last)
	});

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754$1.read(this, offset, true, 23, 4)
	};

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754$1.read(this, offset, false, 23, 4)
	};

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754$1.read(this, offset, true, 52, 8)
	};

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754$1.read(this, offset, false, 52, 8)
	};

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUintLE =
	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let mul = 1;
	  let i = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUintBE =
	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUint8 =
	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeUint16LE =
	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeUint16BE =
	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeUint32LE =
	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset + 3] = (value >>> 24);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 1] = (value >>> 8);
	  this[offset] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeUint32BE =
	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	function wrtBigUInt64LE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  return offset
	}

	function wrtBigUInt64BE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset + 7] = lo;
	  lo = lo >> 8;
	  buf[offset + 6] = lo;
	  lo = lo >> 8;
	  buf[offset + 5] = lo;
	  lo = lo >> 8;
	  buf[offset + 4] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset + 3] = hi;
	  hi = hi >> 8;
	  buf[offset + 2] = hi;
	  hi = hi >> 8;
	  buf[offset + 1] = hi;
	  hi = hi >> 8;
	  buf[offset] = hi;
	  return offset + 8
	}

	Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = 0;
	  let mul = 1;
	  let sub = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  let sub = 0;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
	  if (value < 0) value = 0xff + value + 1;
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 3] = (value >>> 24);
	  return offset + 4
	};

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  if (value < 0) value = 0xffffffff + value + 1;
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4);
	  }
	  ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	};

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8);
	  }
	  ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	};

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
	  if (!start) start = 0;
	  if (!end && end !== 0) end = this.length;
	  if (targetStart >= target.length) targetStart = target.length;
	  if (!targetStart) targetStart = 0;
	  if (end > 0 && end < start) end = start;

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length;
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start;
	  }

	  const len = end - start;

	  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
	    // Use built-in when available, missing from IE11
	    this.copyWithin(targetStart, start, end);
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, end),
	      targetStart
	    );
	  }

	  return len
	};

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start;
	      start = 0;
	      end = this.length;
	    } else if (typeof end === 'string') {
	      encoding = end;
	      end = this.length;
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	    if (val.length === 1) {
	      const code = val.charCodeAt(0);
	      if ((encoding === 'utf8' && code < 128) ||
	          encoding === 'latin1') {
	        // Fast path: If `val` fits into a single byte, use that numeric value.
	        val = code;
	      }
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255;
	  } else if (typeof val === 'boolean') {
	    val = Number(val);
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0;
	  end = end === undefined ? this.length : end >>> 0;

	  if (!val) val = 0;

	  let i;
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val;
	    }
	  } else {
	    const bytes = Buffer.isBuffer(val)
	      ? val
	      : Buffer.from(val, encoding);
	    const len = bytes.length;
	    if (len === 0) {
	      throw new TypeError('The value "' + val +
	        '" is invalid for argument "value"')
	    }
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len];
	    }
	  }

	  return this
	};

	// CUSTOM ERRORS
	// =============

	// Simplified versions from Node, changed for Buffer-only usage
	const errors = {};
	function E (sym, getMessage, Base) {
	  errors[sym] = class NodeError extends Base {
	    constructor () {
	      super();

	      Object.defineProperty(this, 'message', {
	        value: getMessage.apply(this, arguments),
	        writable: true,
	        configurable: true
	      });

	      // Add the error code to the name to include it in the stack trace.
	      this.name = `${this.name} [${sym}]`;
	      // Access the stack to generate the error message including the error code
	      // from the name.
	      this.stack; // eslint-disable-line no-unused-expressions
	      // Reset the name to the actual name.
	      delete this.name;
	    }

	    get code () {
	      return sym
	    }

	    set code (value) {
	      Object.defineProperty(this, 'code', {
	        configurable: true,
	        enumerable: true,
	        value,
	        writable: true
	      });
	    }

	    toString () {
	      return `${this.name} [${sym}]: ${this.message}`
	    }
	  };
	}

	E('ERR_BUFFER_OUT_OF_BOUNDS',
	  function (name) {
	    if (name) {
	      return `${name} is outside of buffer bounds`
	    }

	    return 'Attempt to access memory outside buffer bounds'
	  }, RangeError);
	E('ERR_INVALID_ARG_TYPE',
	  function (name, actual) {
	    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
	  }, TypeError);
	E('ERR_OUT_OF_RANGE',
	  function (str, range, input) {
	    let msg = `The value of "${str}" is out of range.`;
	    let received = input;
	    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
	      received = addNumericalSeparator(String(input));
	    } else if (typeof input === 'bigint') {
	      received = String(input);
	      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
	        received = addNumericalSeparator(received);
	      }
	      received += 'n';
	    }
	    msg += ` It must be ${range}. Received ${received}`;
	    return msg
	  }, RangeError);

	function addNumericalSeparator (val) {
	  let res = '';
	  let i = val.length;
	  const start = val[0] === '-' ? 1 : 0;
	  for (; i >= start + 4; i -= 3) {
	    res = `_${val.slice(i - 3, i)}${res}`;
	  }
	  return `${val.slice(0, i)}${res}`
	}

	// CHECK FUNCTIONS
	// ===============

	function checkBounds (buf, offset, byteLength) {
	  validateNumber(offset, 'offset');
	  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
	    boundsError(offset, buf.length - (byteLength + 1));
	  }
	}

	function checkIntBI (value, min, max, buf, offset, byteLength) {
	  if (value > max || value < min) {
	    const n = typeof min === 'bigint' ? 'n' : '';
	    let range;
	    if (byteLength > 3) {
	      if (min === 0 || min === BigInt(0)) {
	        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
	      } else {
	        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
	                `${(byteLength + 1) * 8 - 1}${n}`;
	      }
	    } else {
	      range = `>= ${min}${n} and <= ${max}${n}`;
	    }
	    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
	  }
	  checkBounds(buf, offset, byteLength);
	}

	function validateNumber (value, name) {
	  if (typeof value !== 'number') {
	    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
	  }
	}

	function boundsError (value, length, type) {
	  if (Math.floor(value) !== value) {
	    validateNumber(value, type);
	    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
	  }

	  if (length < 0) {
	    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
	  }

	  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
	                                    `>= ${type ? 1 : 0} and <= ${length}`,
	                                    value)
	}

	// HELPER FUNCTIONS
	// ================

	const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

	function base64clean (str) {
	  // Node takes equal signs as end of the Base64 encoding
	  str = str.split('=')[0];
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = str.trim().replace(INVALID_BASE64_RE, '');
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '=';
	  }
	  return str
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity;
	  let codePoint;
	  const length = string.length;
	  let leadSurrogate = null;
	  const bytes = [];

	  for (let i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i);

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint;

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	        leadSurrogate = codePoint;
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	    }

	    leadSurrogate = null;

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint);
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF);
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  let c, hi, lo;
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i);
	    hi = c >> 8;
	    lo = c % 256;
	    byteArray.push(lo);
	    byteArray.push(hi);
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  let i;
	  for (i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i];
	  }
	  return i
	}

	// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
	// the `instanceof` check but they should be treated as of that type.
	// See: https://github.com/feross/buffer/issues/166
	function isInstance (obj, type) {
	  return obj instanceof type ||
	    (obj != null && obj.constructor != null && obj.constructor.name != null &&
	      obj.constructor.name === type.name)
	}
	function numberIsNaN (obj) {
	  // For IE11 support
	  return obj !== obj // eslint-disable-line no-self-compare
	}

	// Create lookup table for `toString('hex')`
	// See: https://github.com/feross/buffer/issues/219
	const hexSliceLookupTable = (function () {
	  const alphabet = '0123456789abcdef';
	  const table = new Array(256);
	  for (let i = 0; i < 16; ++i) {
	    const i16 = i * 16;
	    for (let j = 0; j < 16; ++j) {
	      table[i16 + j] = alphabet[i] + alphabet[j];
	    }
	  }
	  return table
	})();

	// Return not function with Error if BigInt not supported
	function defineBigIntMethod (fn) {
	  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
	}

	function BufferBigIntNotDefined () {
	  throw new Error('BigInt not supported')
	}
} (buffer));

var sha3 = {};

var sponge = {};

var permute = {};

var chi = {};

var copy=function copy(I,i){return function(O,o){var oi=o*2;var ii=i*2;O[oi]=I[ii];O[oi+1]=I[ii+1];}};var copy_1=copy;

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _copy=_interopRequireDefault(copy_1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var chi=function chi(_ref){var A=_ref.A,C=_ref.C;for(var y=0;y<25;y+=5){for(var x=0;x<5;x++){(0, _copy["default"])(A,y+x)(C,x);}for(var _x=0;_x<5;_x++){var xy=(y+_x)*2;var x1=(_x+1)%5*2;var x2=(_x+2)%5*2;A[xy]^=~C[x1]&C[x2];A[xy+1]^=~C[x1+1]&C[x2+1];}}};var _default=chi;exports["default"]=_default;
} (chi));

var iota = {};

var roundConstants = {};

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var ROUND_CONSTANTS=new Uint32Array([0,1,0,32898,2147483648,32906,2147483648,2147516416,0,32907,0,2147483649,2147483648,2147516545,2147483648,32777,0,138,0,136,0,2147516425,0,2147483658,0,2147516555,2147483648,139,2147483648,32905,2147483648,32771,2147483648,32770,2147483648,128,0,32778,2147483648,2147483658,2147483648,2147516545,2147483648,32896,0,2147483649,2147483648,2147516424]);var _default=ROUND_CONSTANTS;exports["default"]=_default;
} (roundConstants));

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _roundConstants=_interopRequireDefault(roundConstants);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var iota=function iota(_ref){var A=_ref.A,roundIndex=_ref.roundIndex;var i=roundIndex*2;A[0]^=_roundConstants["default"][i];A[1]^=_roundConstants["default"][i+1];};var _default=iota;exports["default"]=_default;
} (iota));

var rhoPi = {};

var piShuffles = {};

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var PI_SHUFFLES=[10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1];var _default=PI_SHUFFLES;exports["default"]=_default;
} (piShuffles));

var rhoOffsets = {};

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var RHO_OFFSETS=[1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44];var _default=RHO_OFFSETS;exports["default"]=_default;
} (rhoOffsets));

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _piShuffles=_interopRequireDefault(piShuffles);var _rhoOffsets=_interopRequireDefault(rhoOffsets);var _copy=_interopRequireDefault(copy_1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var rhoPi=function rhoPi(_ref){var A=_ref.A,C=_ref.C,W=_ref.W;(0, _copy["default"])(A,1)(W,0);var H=0;var L=0;var Wi=0;var ri=32;for(var i=0;i<24;i++){var j=_piShuffles["default"][i];var r=_rhoOffsets["default"][i];(0, _copy["default"])(A,j)(C,0);H=W[0];L=W[1];ri=32-r;Wi=r<32?0:1;W[Wi]=H<<r|L>>>ri;W[(Wi+1)%2]=L<<r|H>>>ri;(0, _copy["default"])(W,0)(A,j);(0, _copy["default"])(C,0)(W,0);}};var _default=rhoPi;exports["default"]=_default;
} (rhoPi));

var theta = {};

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _copy=_interopRequireDefault(copy_1);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var theta=function theta(_ref){var A=_ref.A,C=_ref.C,D=_ref.D,W=_ref.W;var H=0;var L=0;for(var x=0;x<5;x++){var x20=x*2;var x21=(x+5)*2;var x22=(x+10)*2;var x23=(x+15)*2;var x24=(x+20)*2;C[x20]=A[x20]^A[x21]^A[x22]^A[x23]^A[x24];C[x20+1]=A[x20+1]^A[x21+1]^A[x22+1]^A[x23+1]^A[x24+1];}for(var _x=0;_x<5;_x++){(0, _copy["default"])(C,(_x+1)%5)(W,0);H=W[0];L=W[1];W[0]=H<<1|L>>>31;W[1]=L<<1|H>>>31;D[_x*2]=C[(_x+4)%5*2]^W[0];D[_x*2+1]=C[(_x+4)%5*2+1]^W[1];for(var y=0;y<25;y+=5){A[(y+_x)*2]^=D[_x*2];A[(y+_x)*2+1]^=D[_x*2+1];}}};var _default=theta;exports["default"]=_default;
} (theta));

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _chi=_interopRequireDefault(chi);var _iota=_interopRequireDefault(iota);var _rhoPi=_interopRequireDefault(rhoPi);var _theta=_interopRequireDefault(theta);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var permute=function permute(){var C=new Uint32Array(10);var D=new Uint32Array(10);var W=new Uint32Array(2);return function(A){for(var roundIndex=0;roundIndex<24;roundIndex++){(0, _theta["default"])({A:A,C:C,D:D,W:W});(0, _rhoPi["default"])({A:A,C:C,W:W});(0, _chi["default"])({A:A,C:C});(0, _iota["default"])({A:A,roundIndex:roundIndex});}C.fill(0);D.fill(0);W.fill(0);}};var _default=permute;exports["default"]=_default;
} (permute));

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=void 0;var _buffer=buffer;var _permute=_interopRequireDefault(permute);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var xorWords=function xorWords(I,O){for(var i=0;i<I.length;i+=8){var o=i/4;O[o]^=I[i+7]<<24|I[i+6]<<16|I[i+5]<<8|I[i+4];O[o+1]^=I[i+3]<<24|I[i+2]<<16|I[i+1]<<8|I[i];}return O};var readWords=function readWords(I,O){for(var o=0;o<O.length;o+=8){var i=o/4;O[o]=I[i+1];O[o+1]=I[i+1]>>>8;O[o+2]=I[i+1]>>>16;O[o+3]=I[i+1]>>>24;O[o+4]=I[i];O[o+5]=I[i]>>>8;O[o+6]=I[i]>>>16;O[o+7]=I[i]>>>24;}return O};var Sponge=function Sponge(_ref){var _this=this;var capacity=_ref.capacity,padding=_ref.padding;var keccak=(0, _permute["default"])();var stateSize=200;var blockSize=capacity/8;var queueSize=stateSize-capacity/4;var queueOffset=0;var state=new Uint32Array(stateSize/4);var queue=_buffer.Buffer.allocUnsafe(queueSize);this.absorb=function(buffer){for(var i=0;i<buffer.length;i++){queue[queueOffset]=buffer[i];queueOffset+=1;if(queueOffset>=queueSize){xorWords(queue,state);keccak(state);queueOffset=0;}}return _this};this.squeeze=function(){var options=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var output={buffer:options.buffer||_buffer.Buffer.allocUnsafe(blockSize),padding:options.padding||padding,queue:_buffer.Buffer.allocUnsafe(queue.length),state:new Uint32Array(state.length)};queue.copy(output.queue);for(var i=0;i<state.length;i++){output.state[i]=state[i];}output.queue.fill(0,queueOffset);output.queue[queueOffset]|=output.padding;output.queue[queueSize-1]|=128;xorWords(output.queue,output.state);for(var offset=0;offset<output.buffer.length;offset+=queueSize){keccak(output.state);readWords(output.state,output.buffer.slice(offset,offset+queueSize));}return output.buffer};this.reset=function(){queue.fill(0);state.fill(0);queueOffset=0;return _this};return this};var _default=Sponge;exports["default"]=_default;
} (sponge));

(function (exports) {
Object.defineProperty(exports,"__esModule",{value:true});exports["default"]=exports.SHAKE=exports.SHA3Hash=exports.SHA3=exports.Keccak=void 0;var _buffer=buffer;var _sponge=_interopRequireDefault(sponge);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{"default":obj}}var createHash=function createHash(_ref){var allowedSizes=_ref.allowedSizes,defaultSize=_ref.defaultSize,padding=_ref.padding;return function Hash(){var _this=this;var size=arguments.length>0&&arguments[0]!==undefined?arguments[0]:defaultSize;if(!this||this.constructor!==Hash){return new Hash(size)}if(allowedSizes&&!allowedSizes.includes(size)){throw new Error("Unsupported hash length")}var sponge=new _sponge["default"]({capacity:size});this.update=function(input){var encoding=arguments.length>1&&arguments[1]!==undefined?arguments[1]:"utf8";if(_buffer.Buffer.isBuffer(input)){sponge.absorb(input);return _this}if(typeof input==="string"){return _this.update(_buffer.Buffer.from(input,encoding))}throw new TypeError("Not a string or buffer")};this.digest=function(){var formatOrOptions=arguments.length>0&&arguments[0]!==undefined?arguments[0]:"binary";var options=typeof formatOrOptions==="string"?{format:formatOrOptions}:formatOrOptions;var buffer=sponge.squeeze({buffer:options.buffer,padding:options.padding||padding});if(options.format&&options.format!=="binary"){return buffer.toString(options.format)}return buffer};this.reset=function(){sponge.reset();return _this};return this}};var Keccak=createHash({allowedSizes:[224,256,384,512],defaultSize:512,padding:1});exports.Keccak=Keccak;var SHA3=createHash({allowedSizes:[224,256,384,512],defaultSize:512,padding:6});exports.SHA3=SHA3;var SHAKE=createHash({allowedSizes:[128,256],defaultSize:256,padding:31});exports.SHAKE=SHAKE;var SHA3Hash=Keccak;exports.SHA3Hash=SHA3Hash;SHA3.SHA3Hash=SHA3Hash;var _default=SHA3;exports["default"]=_default;
} (sha3));

const t=Number.EPSILON/2,e=(e=`${Date.now()}`)=>{const r=(()=>{let t=4022871197;return e=>{const r=e.toString();for(var n=0;n<r.length;n++){t+=r.charCodeAt(n);var o=.02519603282416938*t;t=o>>>0,o-=t,t=(o*=t)>>>0,t+=4294967296*(o-=t);}return 2.3283064365386963e-10*(t>>>0)}})(),n=[r(" "),r(" "),r(" "),1];n[0]-=r(e),n[0]<0&&(n[0]+=1),n[1]-=r(e),n[1]<0&&(n[1]+=1),n[2]-=r(e),n[2]<0&&(n[2]+=1);const o={random:()=>{const t=2091639*n[0]+2.3283064365386963e-10*n[3];return n[0]=n[1],n[1]=n[2],n[2]=t-(n[3]=Math.floor(t))},uint32:()=>4294967296*o.random(),fract53:()=>o.random()+Math.trunc(2097152*o.random())*t,exportState:()=>({seed0:n[0],seed1:n[1],seed2:n[2],constant:n[3]}),importState:t=>{[n[0],n[1],n[2],n[3]]=[t.seed0,t.seed1,t.seed2,t.constant];}};return o},r=e().random;

/**
 * Common math and byte functions
 */
class Utilities {
    constructor() {
    }
    /**
     * Get a random int within 0 to n
     * @param n
     */
    static nextInt(n) {
        return Math.floor(r() * n);
    }
    /**
     * Convert a hex number to decimal
     * @param hexString
     */
    static hexToDec(hexString) {
        return parseInt(hexString, 16);
    }
    /**
     * Convert a number to a byte representation
     * @param n
     */
    static byte(n) {
        n = n % 256;
        while (n < 0) {
            n += 256;
        }
        return n;
    }
    /**
     * Convert an unsigned int to a byte
     * @param n
     */
    static intToByte(n) {
        while (n > 255) {
            n = n - 256;
        }
        return n;
    }
    /**
     * Get the int 16 representation of the number
     * @param n
     */
    static int16(n) {
        const end = -32768;
        const start = 32767;
        if (n < end) {
            n = n + 32769;
            n = Utilities.uint16(n);
            n = start + n;
            return n;
        }
        else if (n > start) {
            n = n - 32768;
            n = Utilities.uint16(n);
            n = end + n;
            return n;
        }
        return n;
    }
    /**
     * Get the unsigned int 16 representation of the number
     * @param n
     */
    static uint16(n) {
        n = n % 65536;
        while (n < 0) {
            n += 65536;
        }
        return n;
    }
    /**
     * Get the unsigned int 32 representation of the number
     * @param n
     */
    static int32(n) {
        const end = -2147483648;
        const start = 2147483647;
        if (n < end) {
            n = n + 2147483649;
            n = Utilities.uint32(n);
            n = start + n;
            return n;
        }
        else if (n > start) {
            n = n - 2147483648;
            n = Utilities.uint32(n);
            n = end + n;
            return n;
        }
        return n;
    }
    /**
     * Get the unsigned int 32 representation of the number
     * @param n
     */
    static uint32(n) {
        n = n % 4294967296;
        while (n < 4294967296) {
            n += 4294967296;
        }
        return n;
    }
    /**
     * Test to compare the equality of two byte arrays
     *
     * Returns 0 if they are equal
     */
    static constantTimeCompare(a, b) {
        // check array lengths
        if (a.length !== b.length) {
            return 1;
        }
        // check contents
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return 1;
            }
        }
        return 0;
    }
}

/**
 * Utility class for byte operations
 */
class ByteOps {
    constructor(paramsK) {
        this.paramsK = paramsK;
    }
    /**
     * Generate a polynomial with coefficients distributed according to a
     * centered binomial distribution with parameter eta, given an array of
     * uniformly random bytes.
     *
     * @param buff
     * @param paramsK
     * @return
     */
    generateCBDPoly(buff, paramsK) {
        const buf = buffer.Buffer.from(buff);
        let t, d;
        let a, b;
        let r = new Array(KyberService.paramsPolyBytes).fill(0);
        switch (paramsK) {
            case 2:
                for (let i = 0; i < KyberService.paramsN / 4; i++) {
                    t = this.convertByteTo24BitUnsignedInt(buf.slice(3 * i, buf.length));
                    d = t & 0x00249249;
                    d = d + ((t >> 1) & 0x00249249);
                    d = d + ((t >> 2) & 0x00249249);
                    for (let j = 0; j < 4; j++) {
                        a = Utilities.int16((d >> (6 * j + 0)) & 0x7);
                        b = Utilities.int16((d >> (6 * j + KyberService.paramsETAK512)) & 0x7);
                        r[4 * i + j] = a - b;
                    }
                }
                break;
            default:
                for (let i = 0; i < KyberService.paramsN / 8; i++) {
                    t = (this.convertByteTo32BitUnsignedInt(buf.slice(4 * i, buf.length)));
                    d = (t & 0x55555555);
                    d = d + (((t >> 1) & 0x55555555) >>> 0);
                    for (let j = 0; j < 8; j++) {
                        a = Utilities.int16((((d >> (4 * j + 0))) & 0x3));
                        b = Utilities.int16((((d >> (4 * j + KyberService.paramsETAK768K1024))) & 0x3));
                        r[8 * i + j] = a - b;
                    }
                }
        }
        return r;
    }
    /**
     * Returns a 24-bit unsigned integer as a long from byte x
     *
     * @param x
     * @return
     */
    convertByteTo24BitUnsignedInt(x) {
        let r;
        r = Utilities.int32(x[0] & 0xFF);
        r = r | (Utilities.int32(x[1] & 0xFF) << 8);
        r = r | (Utilities.int32(x[2] & 0xFF) << 16);
        return r;
    }
    /**
     * Returns a 24-bit unsigned integer as a long from byte x
     *
     * @param x
     * @return
     */
    convertByteTo32BitUnsignedInt(x) {
        let r;
        r = Utilities.int32(x[0] & 0xFF);
        r = (((r | (Utilities.int32(x[1] & 0xFF) << 8))));
        r = (((r | (Utilities.int32(x[2] & 0xFF) << 16))));
        r = (((r | Utilities.int32(Utilities.int32(x[3] & 0xFF) << 24))));
        //     last one won't print the same as java
        return r;
    }
    /**
     * Computes a Barrett reduction given a 16 Bit Integer
     *
     * @param a
     * @return
     */
    barrettReduce(a) {
        let shift = Utilities.int32(1 << 26);
        let v = +Utilities.int16((shift + (KyberService.paramsQ / 2)) / KyberService.paramsQ).toFixed(0);
        let t = Utilities.int16((v * a) >> 26);
        t = Utilities.int16(t * KyberService.paramsQ);
        return a - t;
    }
    /**
     * Multiply the given shorts and then run a Montgomery reduce
     *
     * @param a
     * @param b
     * @return
     */
    modQMulMont(a, b) {
        return this.byteopsMontgomeryReduce(a * b);
    }
    /**
     * Computes a Montgomery reduction given a 32 Bit Integer
     *
     * @param a
     * @return
     */
    byteopsMontgomeryReduce(a) {
        let u = Utilities.int16(Utilities.uint16(a) * KyberService.paramsQinv);
        let t = u * KyberService.paramsQ;
        t = a - t;
        t >>= 16;
        return Utilities.int16(t);
    }
}

class Poly {
    constructor(paramsK) {
        this.paramsK = paramsK;
        this.byteOps = new ByteOps(this.paramsK);
    }
    /**
     * Applies the inverse number-theoretic transform (NTT) to all elements of a
     * vector of polynomials and multiplies by Montgomery factor 2^16
     * @param r
     */
    polyVectorInvNTTMont(r) {
        for (let i = 0; i < this.paramsK; i++) {
            r[i] = this.polyInvNTTMont(r[i]);
        }
        return r;
    }
    /**
     * Applies Barrett reduction to each coefficient of each element of a vector
     * of polynomials.
     *
     * @param r
     * @return
     */
    polyVectorReduce(r) {
        for (let i = 0; i < this.paramsK; i++) {
            r[i] = this.polyReduce(r[i]);
        }
        return r;
    }
    /**
     * Computes an in-place inverse of a negacyclic number-theoretic transform
     * (NTT) of a polynomial
     *
     * Input is assumed bit-revered order
     *
     * Output is assumed normal order
     *
     * @param r
     * @return
     */
    polyInvNTTMont(r) {
        return this.invNTT(r);
    }
    /**
     * Applies forward number-theoretic transforms (NTT) to all elements of a
     * vector of polynomial
     *
     * @param r
     * @return
     */
    polyVectorNTT(r) {
        for (let i = 0; i < this.paramsK; i++) {
            r[i] = this.ntt(r[i]);
        }
        return r;
    }
    /**
     * Deserialize a byte array into a polynomial vector
     *
     * @param a
     * @return
     */
    polyVectorFromBytes(a) {
        let r = [];
        let start;
        let end;
        for (let i = 0; i < this.paramsK; i++) {
            start = (i * KyberService.paramsPolyBytes);
            end = (i + 1) * KyberService.paramsPolyBytes;
            r[i] = this.polyFromBytes(a.slice(start, end));
        }
        return r;
    }
    /**
     * Serialize a polynomial in to an array of bytes
     *
     * @param a
     * @return
     */
    polyToBytes(a) {
        let t0, t1;
        let r = [];
        let a2 = this.polyConditionalSubQ(a);
        for (let i = 0; i < KyberService.paramsN / 2; i++) {
            t0 = Utilities.uint16(a2[2 * i]);
            t1 = Utilities.uint16(a2[2 * i + 1]);
            r[3 * i + 0] = Utilities.byte(t0 >> 0);
            r[3 * i + 1] = Utilities.byte(t0 >> 8) | Utilities.byte(t1 << 4);
            r[3 * i + 2] = Utilities.byte(t1 >> 4);
        }
        return r;
    }
    /**
     * Check the 0xFFF
     * @param a
     */
    polyFromBytes(a) {
        let r = [];
        for (let i = 0; i < KyberService.paramsPolyBytes; i++) {
            r[i] = 0;
        }
        for (let i = 0; i < KyberService.paramsN / 2; i++) {
            r[2 * i] = Utilities.int16(((Utilities.uint16(a[3 * i + 0]) >> 0) | (Utilities.uint16(a[3 * i + 1]) << 8)) & 0xFFF);
            r[2 * i + 1] = Utilities.int16(((Utilities.uint16(a[3 * i + 1]) >> 4) | (Utilities.uint16(a[3 * i + 2]) << 4)) & 0xFFF);
        }
        return r;
    }
    /**
     * Convert a polynomial to a 32-byte message
     *
     * @param a
     * @return
     */
    polyToMsg(a) {
        const msg = []; // 32
        let t;
        const a2 = this.polyConditionalSubQ(a);
        for (let i = 0; i < KyberService.paramsN / 8; i++) {
            msg[i] = 0;
            for (let j = 0; j < 8; j++) {
                t = (((Utilities.uint16(a2[8 * i + j]) << 1) + Utilities.uint16(KyberService.paramsQ / 2)) / Utilities.uint16(KyberService.paramsQ)) & 1;
                msg[i] |= Utilities.byte(t << j);
            }
        }
        return msg;
    }
    /**
     * Convert a 32-byte message to a polynomial
     *
     * @param msg
     * @return
     */
    polyFromData(msg) {
        let r = [];
        for (let i = 0; i < KyberService.paramsPolyBytes; ++i) {
            r[i] = 0;
        }
        let mask;
        for (let i = 0; i < KyberService.paramsN / 8; i++) {
            for (let j = 0; j < 8; j++) {
                mask = -1 * Utilities.int16((msg[i] >> j) & 1);
                r[8 * i + j] = mask & Utilities.int16((KyberService.paramsQ + 1) / 2);
            }
        }
        return r;
    }
    /**
     * Generate a deterministic noise polynomial from a seed and nonce
     *
     * The polynomial output will be close to a centered binomial distribution
     *
     * @param seed
     * @param nonce
     * @param paramsK
     * @return
     */
    getNoisePoly(seed, nonce, paramsK) {
        let l;
        switch (paramsK) {
            case 2:
                l = KyberService.paramsETAK512 * KyberService.paramsN / 4;
                break;
            default:
                l = KyberService.paramsETAK768K1024 * KyberService.paramsN / 4;
        }
        let p = this.generatePRFByteArray(l, seed, nonce);
        return this.byteOps.generateCBDPoly(p, paramsK);
    }
    /**
     * Pseudo-random function to derive a deterministic array of random bytes
     * from the supplied secret key object and other parameters.
     *
     * @param l
     * @param key
     * @param nonce
     * @return
     */
    generatePRFByteArray(l, key, nonce) {
        const nonce_arr = []; // 1
        nonce_arr[0] = nonce;
        const hash = new sha3.SHAKE(256);
        hash.reset();
        const buffer1 = buffer.Buffer.from(key);
        const buffer2 = buffer.Buffer.from(nonce_arr);
        hash.update(buffer1).update(buffer2);
        const bufString = hash.digest({ format: "binary", buffer: buffer.Buffer.alloc(l) }); // 128 long byte array
        const buf = buffer.Buffer.alloc(bufString.length);
        for (let i = 0; i < bufString.length; ++i) {
            buf[i] = +bufString[i];
        }
        return buf;
    }
    /**
     * Perform an in-place number-theoretic transform (NTT)
     *
     * Input is in standard order
     *
     * Output is in bit-reversed order
     *
     * @param r
     * @return
     */
    ntt(r) {
        let j = 0;
        let k = 1;
        let zeta;
        let t;
        for (let l = 128; l >= 2; l >>= 1) {
            // 0,
            for (let start = 0; start < 256; start = j + l) {
                zeta = KyberService.nttZetas[k];
                k++;
                for (j = start; j < start + l; j++) {
                    t = this.byteOps.modQMulMont(zeta, r[j + l]); // t is mod q
                    r[j + l] = Utilities.int16(r[j] - t);
                    r[j] = Utilities.int16(r[j] + t);
                }
            }
        }
        return r;
    }
    /**
     * Apply Barrett reduction to all coefficients of this polynomial
     *
     * @param r
     * @return
     */
    polyReduce(r) {
        for (let i = 0; i < KyberService.paramsN; i++) {
            r[i] = this.byteOps.barrettReduce(r[i]);
        }
        return r;
    }
    /**
     * Performs an in-place conversion of all coefficients of a polynomial from
     * the normal domain to the Montgomery domain
     *
     * @param polyR
     * @return
     */
    polyToMont(r) {
        for (let i = 0; i < KyberService.paramsN; i++) {
            r[i] = this.byteOps.byteopsMontgomeryReduce(Utilities.int32(r[i]) * Utilities.int32(1353));
        }
        return r;
    }
    /**
     * Pointwise-multiplies elements of the given polynomial-vectors ,
     * accumulates the results , and then multiplies by 2^-16
     *
     * @param a
     * @param b
     * @return
     */
    polyVectorPointWiseAccMont(a, b) {
        let r = this.polyBaseMulMont(a[0], b[0]);
        let t;
        for (let i = 1; i < this.paramsK; i++) {
            t = this.polyBaseMulMont(a[i], b[i]);
            r = this.polyAdd(r, t);
        }
        return this.polyReduce(r);
    }
    /**
     * Multiply two polynomials in the number-theoretic transform (NTT) domain
     *
     * @param a
     * @param b
     * @return
     */
    polyBaseMulMont(a, b) {
        let rx, ry;
        for (let i = 0; i < KyberService.paramsN / 4; i++) {
            rx = this.nttBaseMuliplier(a[4 * i + 0], a[4 * i + 1], b[4 * i + 0], b[4 * i + 1], KyberService.nttZetas[64 + i]);
            ry = this.nttBaseMuliplier(a[4 * i + 2], a[4 * i + 3], b[4 * i + 2], b[4 * i + 3], -KyberService.nttZetas[64 + i]);
            a[4 * i + 0] = rx[0];
            a[4 * i + 1] = rx[1];
            a[4 * i + 2] = ry[0];
            a[4 * i + 3] = ry[1];
        }
        return a;
    }
    /**
     * Performs the multiplication of polynomials
     *
     * @param a0
     * @param a1
     * @param b0
     * @param b1
     * @param zeta
     * @return
     */
    nttBaseMuliplier(a0, a1, b0, b1, zeta) {
        let r = []; // 2
        r[0] = this.byteOps.modQMulMont(a1, b1);
        r[0] = this.byteOps.modQMulMont(r[0], zeta);
        r[0] = r[0] + this.byteOps.modQMulMont(a0, b0);
        r[1] = this.byteOps.modQMulMont(a0, b1);
        r[1] = r[1] + this.byteOps.modQMulMont(a1, b0);
        return r;
    }
    /**
     * Add two polynomial vectors
     *
     * @param a
     * @param b
     * @return
     */
    polyVectorAdd(a, b) {
        for (let i = 0; i < this.paramsK; i++) {
            a[i] = this.polyAdd(a[i], b[i]);
        }
        return a;
    }
    /**
     * Add two polynomials
     *
     * @param a
     * @param b
     * @return
     */
    polyAdd(a, b) {
        let c = [];
        // needs to be 384
        for (let i = 0; i < a.length; ++i) {
            c[i] = 0;
        }
        for (let i = 0; i < KyberService.paramsN; i++) {
            c[i] = a[i] + b[i];
        }
        return c;
    }
    /**
     * Subtract two polynomials
     *
     * @param a
     * @param b
     * @return
     */
    subtract(a, b) {
        for (let i = 0; i < KyberService.paramsN; i++) {
            a[i] = a[i] - b[i];
        }
        return a;
    }
    /**
     * Perform an in-place inverse number-theoretic transform (NTT)
     *
     * Input is in bit-reversed order
     *
     * Output is in standard order
     *
     * @param r
     * @return
     */
    invNTT(r) {
        let j = 0;
        let k = 0;
        let zeta;
        let t;
        for (let l = 2; l <= 128; l <<= 1) {
            for (let start = 0; start < 256; start = j + l) {
                zeta = KyberService.nttZetasInv[k];
                k = k + 1;
                for (j = start; j < start + l; j++) {
                    t = r[j];
                    r[j] = this.byteOps.barrettReduce(t + r[j + l]);
                    r[j + l] = t - r[j + l];
                    r[j + l] = this.byteOps.modQMulMont(zeta, r[j + l]);
                }
            }
        }
        for (j = 0; j < 256; j++) {
            r[j] = this.byteOps.modQMulMont(r[j], KyberService.nttZetasInv[127]);
        }
        return r;
    }
    /**
     * Perform a lossly compression and serialization of a vector of polynomials
     *
     * @param a
     * @param paramsK
     * @return
     */
    compressPolyVector(a) {
        a = this.polyVectorCSubQ(a);
        let rr = 0;
        let r = [];
        let t = [];
        switch (this.paramsK) {
            case 2:
            case 3:
                for (let i = 0; i < this.paramsK; i++) {
                    for (let j = 0; j < KyberService.paramsN / 4; j++) {
                        for (let k = 0; k < 4; k++) {
                            t[k] = (((a[i][4 * j + k] << 10) + KyberService.paramsQ / 2) / KyberService.paramsQ) & 0b1111111111;
                        }
                        r[rr + 0] = Utilities.byte(t[0] >> 0);
                        r[rr + 1] = Utilities.byte(Utilities.byte(t[0] >> 8) | Utilities.byte(t[1] << 2));
                        r[rr + 2] = Utilities.byte(Utilities.byte(t[1] >> 6) | Utilities.byte(t[2] << 4));
                        r[rr + 3] = Utilities.byte(Utilities.byte(t[2] >> 4) | Utilities.byte(t[3] << 6));
                        r[rr + 4] = Utilities.byte((t[3] >> 2));
                        rr = rr + 5;
                    }
                }
                break;
            default:
                for (let i = 0; i < this.paramsK; i++) {
                    for (let j = 0; j < KyberService.paramsN / 8; j++) {
                        for (let k = 0; k < 8; k++) {
                            t[k] = Utilities.int32((((Utilities.int32(a[i][8 * j + k]) << 11) + Utilities.int32(KyberService.paramsQ / 2)) / Utilities.int32(KyberService.paramsQ)) & 0x7ff);
                        }
                        r[rr + 0] = Utilities.byte((t[0] >> 0));
                        r[rr + 1] = Utilities.byte((t[0] >> 8) | (t[1] << 3));
                        r[rr + 2] = Utilities.byte((t[1] >> 5) | (t[2] << 6));
                        r[rr + 3] = Utilities.byte((t[2] >> 2));
                        r[rr + 4] = Utilities.byte((t[2] >> 10) | (t[3] << 1));
                        r[rr + 5] = Utilities.byte((t[3] >> 7) | (t[4] << 4));
                        r[rr + 6] = Utilities.byte((t[4] >> 4) | (t[5] << 7));
                        r[rr + 7] = Utilities.byte((t[5] >> 1));
                        r[rr + 8] = Utilities.byte((t[5] >> 9) | (t[6] << 2));
                        r[rr + 9] = Utilities.byte((t[6] >> 6) | (t[7] << 5));
                        r[rr + 10] = Utilities.byte((t[7] >> 3));
                        rr = rr + 11;
                    }
                }
        }
        return r;
    }
    /**
     * Performs lossy compression and serialization of a polynomial
     *
     * @param polyA
     * @return
     */
    compressPoly(polyA) {
        let rr = 0;
        let r = [];
        let t = []; // 8
        const qDiv2 = (KyberService.paramsQ / 2);
        switch (this.paramsK) {
            case 2:
            case 3:
                for (let i = 0; i < KyberService.paramsN / 8; i++) {
                    for (let j = 0; j < 8; j++) {
                        const step1 = Utilities.int32((polyA[8 * i + j]) << 4);
                        const step2 = Utilities.int32((step1 + qDiv2) / (KyberService.paramsQ));
                        t[j] = Utilities.intToByte(step2 & 15);
                    }
                    r[rr + 0] = Utilities.intToByte(t[0] | (t[1] << 4));
                    r[rr + 1] = Utilities.intToByte(t[2] | (t[3] << 4));
                    r[rr + 2] = Utilities.intToByte(t[4] | (t[5] << 4));
                    r[rr + 3] = Utilities.intToByte(t[6] | (t[7] << 4));
                    rr = rr + 4;
                }
                break;
            default:
                for (let i = 0; i < KyberService.paramsN / 8; i++) {
                    for (let j = 0; j < 8; j++) {
                        const step1 = Utilities.int32((polyA[(8 * i) + j] << 5));
                        const step2 = Utilities.int32((step1 + qDiv2) / (KyberService.paramsQ));
                        t[j] = Utilities.intToByte(step2 & 31);
                    }
                    r[rr + 0] = Utilities.intToByte((t[0] >> 0) | (t[1] << 5));
                    r[rr + 1] = Utilities.intToByte((t[1] >> 3) | (t[2] << 2) | (t[3] << 7));
                    r[rr + 2] = Utilities.intToByte((t[3] >> 1) | (t[4] << 4));
                    r[rr + 3] = Utilities.intToByte((t[4] >> 4) | (t[5] << 1) | (t[6] << 6));
                    r[rr + 4] = Utilities.intToByte((t[6] >> 2) | (t[7] << 3));
                    rr = rr + 5;
                }
        }
        return r;
    }
    /**
     * De-serialize and decompress a vector of polynomials
     *
     * Since the compress is lossy, the results will not be exactly the same as
     * the original vector of polynomials
     *
     * @param a
     * @return
     */
    decompressPolyVector(a) {
        const r = []; // this.paramsK
        for (let i = 0; i < this.paramsK; i++) {
            r[i] = [];
        }
        let aa = 0;
        const t = []; // 8
        switch (this.paramsK) {
            //TESTED
            case 2:
            case 3:
                for (let i = 0; i < this.paramsK; i++) {
                    for (let j = 0; j < (KyberService.paramsN / 4); j++) {
                        t[0] = (Utilities.uint16(a[aa + 0]) >> 0) | (Utilities.uint16(a[aa + 1]) << 8);
                        t[1] = (Utilities.uint16(a[aa + 1]) >> 2) | (Utilities.uint16(a[aa + 2]) << 6);
                        t[2] = (Utilities.uint16(a[aa + 2]) >> 4) | (Utilities.uint16(a[aa + 3]) << 4);
                        t[3] = (Utilities.uint16(a[aa + 3]) >> 6) | (Utilities.uint16(a[aa + 4]) << 2);
                        aa = aa + 5;
                        for (let k = 0; k < 4; k++) {
                            r[i][4 * j + k] = (Utilities.uint32(t[k] & 0x3FF) * KyberService.paramsQ + 512) >> 10;
                        }
                    }
                }
                break;
            default:
                for (let i = 0; i < this.paramsK; i++) {
                    for (let j = 0; j < KyberService.paramsN / 8; j++) {
                        t[0] = (Utilities.uint16(a[aa + 0]) >> 0) | (Utilities.uint16(a[aa + 1]) << 8);
                        t[1] = (Utilities.uint16(a[aa + 1]) >> 3) | (Utilities.uint16(a[aa + 2]) << 5);
                        t[2] = (Utilities.uint16(a[aa + 2]) >> 6) | (Utilities.uint16(a[aa + 3]) << 2) | (Utilities.uint16(a[aa + 4]) << 10);
                        t[3] = (Utilities.uint16(a[aa + 4]) >> 1) | (Utilities.uint16(a[aa + 5]) << 7);
                        t[4] = (Utilities.uint16(a[aa + 5]) >> 4) | (Utilities.uint16(a[aa + 6]) << 4);
                        t[5] = (Utilities.uint16(a[aa + 6]) >> 7) | (Utilities.uint16(a[aa + 7]) << 1) | (Utilities.uint16(a[aa + 8]) << 9);
                        t[6] = (Utilities.uint16(a[aa + 8]) >> 2) | (Utilities.uint16(a[aa + 9]) << 6);
                        t[7] = (Utilities.uint16(a[aa + 9]) >> 5) | (Utilities.uint16(a[aa + 10]) << 3);
                        aa = aa + 11;
                        for (let k = 0; k < 8; k++) {
                            r[i][8 * j + k] = (Utilities.uint32(t[k] & 0x7FF) * KyberService.paramsQ + 1024) >> 11;
                        }
                    }
                }
        }
        return r;
    }
    /**
     * Applies the conditional subtraction of Q (KyberParams) to each coefficient of
     * each element of a vector of polynomials.
     */
    polyVectorCSubQ(r) {
        for (let i = 0; i < this.paramsK; i++) {
            r[i] = this.polyConditionalSubQ(r[i]);
        }
        return r;
    }
    /**
     * Apply the conditional subtraction of Q (KyberParams) to each coefficient of a
     * polynomial
     *
     * @param r
     * @return
     */
    polyConditionalSubQ(r) {
        for (let i = 0; i < KyberService.paramsN; i++) {
            r[i] = r[i] - KyberService.paramsQ;
            r[i] = r[i] + ((r[i] >> 31) & KyberService.paramsQ);
        }
        return r;
    }
    /**
     * De-serialize and decompress a vector of polynomials
     *
     * Since the compress is lossy, the results will not be exactly the same as
     * the original vector of polynomials
     *
     * @param a
     * @return
     */
    decompressPoly(a) {
        let r = []; // 384
        let t = []; // 8
        let aa = 0;
        switch (this.paramsK) {
            case 2:
            case 3:
                // TESTED
                for (let i = 0; i < KyberService.paramsN / 2; i++) {
                    r[2 * i + 0] = Utilities.int16((((Utilities.byte(a[aa]) & 15) * Utilities.uint32(KyberService.paramsQ)) + 8) >> 4);
                    r[2 * i + 1] = Utilities.int16((((Utilities.byte(a[aa]) >> 4) * Utilities.uint32(KyberService.paramsQ)) + 8) >> 4);
                    aa = aa + 1;
                }
                break;
            default:
                for (let i = 0; i < KyberService.paramsN / 8; i++) {
                    t[0] = (a[aa + 0] >> 0);
                    t[1] = Utilities.byte(a[aa + 0] >> 5) | Utilities.byte((a[aa + 1] << 3));
                    t[2] = (a[aa + 1] >> 2);
                    t[3] = Utilities.byte((a[aa + 1] >> 7)) | Utilities.byte((a[aa + 2] << 1));
                    t[4] = Utilities.byte((a[aa + 2] >> 4)) | Utilities.byte((a[aa + 3] << 4));
                    t[5] = (a[aa + 3] >> 1);
                    t[6] = Utilities.byte((a[aa + 3] >> 6)) | Utilities.byte((a[aa + 4] << 2));
                    t[7] = (a[aa + 4] >> 3);
                    aa = aa + 5;
                    for (let j = 0; j < 8; j++) {
                        r[8 * i + j] = Utilities.int16(((Utilities.byte(t[j] & 31) * Utilities.uint32(KyberService.paramsQ)) + 16) >> 5);
                    }
                }
        }
        return r;
    }
}

class Indcpa {
    constructor(paramsK) {
        this.paramsK = paramsK;
        this.poly = new Poly(this.paramsK);
    }
    /**
     * Generates public and private keys for the CPA-secure public-key
     * encryption scheme underlying Kyber.
     */
    indcpaKeyGen() {
        // random bytes for seed
        const rnd = buffer.Buffer.alloc(KyberService.paramsSymBytes);
        for (let i = 0; i < KyberService.paramsSymBytes; i++) {
            rnd[i] = Utilities.nextInt(256);
        }
        // hash rnd with SHA3-512
        const buffer1 = buffer.Buffer.from(rnd);
        const hash1 = new sha3.SHA3(512);
        hash1.update(buffer1);
        const seed = hash1.digest();
        const publicSeedBuf = seed.slice(0, KyberService.paramsSymBytes);
        const noiseSeedBuf = seed.slice(KyberService.paramsSymBytes, (KyberService.paramsSymBytes * 2));
        const publicSeed = [];
        const noiseSeed = [];
        for (const num of publicSeedBuf) {
            publicSeed.push(num);
        }
        for (const num of noiseSeedBuf) {
            noiseSeed.push(num);
        }
        // generate public matrix A (already in NTT form)
        const a = this.generateMatrix(publicSeed, false);
        const s = []; //this.paramsK
        const e = []; // this.paramsK
        for (let i = 0; i < this.paramsK; i++) {
            s[i] = this.poly.getNoisePoly(noiseSeed, i, this.paramsK);
            e[i] = this.poly.getNoisePoly(noiseSeed, (i + this.paramsK), this.paramsK);
        }
        for (let i = 0; i < this.paramsK; i++) {
            s[i] = this.poly.ntt(s[i]);
        }
        for (let i = 0; i < this.paramsK; i++) {
            e[i] = this.poly.ntt(e[i]);
        }
        for (let i = 0; i < this.paramsK; i++) {
            s[i] = this.poly.polyReduce(s[i]);
        }
        const pk = []; // this.paramsK
        for (let i = 0; i < this.paramsK; i++) {
            pk[i] = this.poly.polyToMont(this.poly.polyVectorPointWiseAccMont(a[i], s));
        }
        for (let i = 0; i < this.paramsK; i++) {
            pk[i] = this.poly.polyAdd(pk[i], e[i]);
        }
        for (let i = 0; i < this.paramsK; i++) {
            pk[i] = this.poly.polyReduce(pk[i]);
        }
        // ENCODE KEYS
        const keys = []; // 2
        // PUBLIC KEY
        // turn polynomials into byte arrays
        keys[0] = [];
        let bytes = [];
        for (let i = 0; i < this.paramsK; i++) {
            bytes = this.poly.polyToBytes(pk[i]);
            for (let j = 0; j < bytes.length; j++) {
                keys[0].push(bytes[j]);
            }
        }
        // append public seed
        for (let i = 0; i < publicSeed.length; i++) {
            keys[0].push(publicSeed[i]);
        }
        // PRIVATE KEY
        keys[1] = [];
        bytes = [];
        for (let i = 0; i < this.paramsK; i++) {
            bytes = this.poly.polyToBytes(s[i]);
            for (let j = 0; j < bytes.length; j++) {
                keys[1].push(bytes[j]);
            }
        }
        return keys;
    }
    /**
     * Encrypt the given message using the Kyber public-key encryption scheme
     *
     * @param publicKey
     * @param msg
     * @param coins
     * @return
     */
    indcpaEncrypt(publicKey, msg, coins) {
        const pk = [];
        let start;
        let end;
        // decode message m
        let k = this.poly.polyFromData(msg);
        for (let i = 0; i < this.paramsK; i++) {
            start = (i * KyberService.paramsPolyBytes);
            end = (i + 1) * KyberService.paramsPolyBytes;
            pk[i] = this.poly.polyFromBytes(publicKey.slice(start, end));
        }
        let seed;
        switch (this.paramsK) {
            case 2:
                seed = publicKey.slice(KyberService.paramsPolyvecBytesK512, KyberService.paramsIndcpaPublicKeyBytesK512);
                break;
            case 3:
                seed = publicKey.slice(KyberService.paramsPolyvecBytesK768, KyberService.paramsIndcpaPublicKeyBytesK768);
                break;
            default:
                seed = publicKey.slice(KyberService.paramsPolyvecBytesK1024, KyberService.paramsIndcpaPublicKeyBytesK1024);
        }
        const at = this.generateMatrix(seed, true);
        const sp = []; // this.paramsK
        const ep = []; // this.paramsK
        for (let i = 0; i < this.paramsK; i++) {
            sp[i] = this.poly.getNoisePoly(coins, i, this.paramsK);
            ep[i] = this.poly.getNoisePoly(coins, i + this.paramsK, 3);
        }
        let epp = this.poly.getNoisePoly(coins, (this.paramsK * 2), 3);
        for (let i = 0; i < this.paramsK; i++) {
            sp[i] = this.poly.ntt(sp[i]);
        }
        for (let i = 0; i < this.paramsK; i++) {
            sp[i] = this.poly.polyReduce(sp[i]);
        }
        let bp = []; // this.paramsK
        for (let i = 0; i < this.paramsK; i++) {
            bp[i] = this.poly.polyVectorPointWiseAccMont(at[i], sp);
        }
        let v = this.poly.polyVectorPointWiseAccMont(pk, sp);
        bp = this.poly.polyVectorInvNTTMont(bp);
        v = this.poly.invNTT(v);
        bp = this.poly.polyVectorAdd(bp, ep);
        v = this.poly.polyAdd(v, epp);
        v = this.poly.polyAdd(v, k);
        bp = this.poly.polyVectorReduce(bp);
        v = this.poly.polyReduce(v);
        const bCompress = this.poly.compressPolyVector(bp);
        const vCompress = this.poly.compressPoly(v);
        const c3 = [];
        for (let i = 0; i < bCompress.length; ++i) {
            c3[i] = bCompress[i];
        }
        for (let i = 0; i < vCompress.length; ++i) {
            c3[i + bCompress.length] = vCompress[i];
        }
        return c3;
    }
    /**
     * Decrypt the given byte array using the Kyber public-key encryption scheme
     *
     * @param packedCipherText
     * @param privateKey
     * @return
     */
    indcpaDecrypt(packedCipherText, privateKey) {
        let bpEndIndex;
        let vEndIndex;
        switch (this.paramsK) {
            case 2:
                bpEndIndex = KyberService.paramsPolyvecCompressedBytesK512;
                vEndIndex = bpEndIndex + KyberService.paramsPolyCompressedBytesK512;
                break;
            case 3:
                bpEndIndex = KyberService.paramsPolyvecCompressedBytesK768;
                vEndIndex = bpEndIndex + KyberService.paramsPolyCompressedBytesK768;
                break;
            default:
                bpEndIndex = KyberService.paramsPolyvecCompressedBytesK1024;
                vEndIndex = bpEndIndex + KyberService.paramsPolyCompressedBytesK1024;
        }
        let bp = this.poly.decompressPolyVector(packedCipherText.slice(0, bpEndIndex));
        const v = this.poly.decompressPoly(packedCipherText.slice(bpEndIndex, vEndIndex));
        const privateKeyPolyvec = this.poly.polyVectorFromBytes(privateKey);
        bp = this.poly.polyVectorNTT(bp);
        let mp = this.poly.polyVectorPointWiseAccMont(privateKeyPolyvec, bp);
        mp = this.poly.invNTT(mp);
        mp = this.poly.subtract(v, mp);
        mp = this.poly.polyReduce(mp);
        return this.poly.polyToMsg(mp);
    }
    /**
     * Generate a polynomial vector matrix from the given seed
     *
     * @param seed
     * @param transposed
     * @return
     */
    generateMatrix(seed, transposed) {
        let a = []; //this.paramsK)
        const xof = new sha3.SHAKE(128);
        let ctr = 0;
        for (let i = 0; i < this.paramsK; i++) {
            a[i] = []; // this.paramsK
            let transpose = []; // 2
            for (let j = 0; j < this.paramsK; j++) {
                // set if transposed matrix or not
                transpose[0] = j;
                transpose[1] = i;
                if (transposed) {
                    transpose[0] = i;
                    transpose[1] = j;
                }
                // obtain xof of (seed+i+j) or (seed+j+i) depending on above code
                // output is 672 bytes in length
                xof.reset();
                const buffer1 = buffer.Buffer.from(seed);
                const buffer2 = buffer.Buffer.from(transpose);
                xof.update(buffer1).update(buffer2);
                let outputString = xof.digest({ format: "binary", buffer: buffer.Buffer.alloc(672) });
                let output = buffer.Buffer.alloc(outputString.length);
                output.fill(outputString);
                // run rejection sampling on the output from above
                let outputlen = 3 * 168; // 504
                let result = []; // 2
                result = this.generateUniform(output.slice(0, 504), outputlen, KyberService.paramsN);
                a[i][j] = result[0]; // the result here is an NTT-representation
                ctr = result[1]; // keeps track of index of output array from sampling function
                while (ctr < KyberService.paramsN) { // if the polynomial hasnt been filled yet with mod q entries
                    const outputn = output.slice(504, 672); // take last 168 bytes of byte array from xof
                    let result1 = []; //2
                    result1 = this.generateUniform(outputn, 168, KyberService.paramsN - ctr); // run sampling function again
                    let missing = result1[0]; // here is additional mod q polynomial coefficients
                    let ctrn = result1[1]; // how many coefficients were accepted and are in the output
                    // starting at last position of output array from first sampling function until 256 is reached
                    for (let k = ctr; k < KyberService.paramsN; k++) {
                        a[i][j][k] = missing[k - ctr]; // fill rest of array with the additional coefficients until full
                    }
                    ctr = ctr + ctrn; // update index
                }
            }
        }
        return a;
    }
    /**
     * Runs rejection sampling on uniform random bytes to generate uniform
     * random integers modulo `Q`
     *
     * @param buf
     * @param bufl
     * @param len
     * @return
     */
    generateUniform(buf, bufl, len) {
        let uniformR = [];
        for (let i = 0; i < KyberService.paramsPolyBytes; ++i) {
            uniformR[i] = 0;
        }
        let d1, d2;
        let j = 0;
        let uniformI = 0;
        while ((uniformI < len) && ((j + 3) <= bufl)) {
            // compute d1 and d2
            d1 = (Utilities.uint16((buf[j]) >> 0) | (Utilities.uint16(buf[j + 1]) << 8)) & 0xFFF;
            d2 = (Utilities.uint16((buf[j + 1]) >> 4) | (Utilities.uint16(buf[j + 2]) << 4)) & 0xFFF;
            // increment input buffer index by 3
            j = j + 3;
            // if d1 is less than 3329
            if (d1 < KyberService.paramsQ) {
                // assign to d1
                uniformR[uniformI] = d1;
                // increment position of output array
                ++uniformI;
            }
            if (uniformI < len && d2 < KyberService.paramsQ) {
                uniformR[uniformI] = d2;
                ++uniformI;
            }
        }
        let result = []; // 2
        result[0] = uniformR; // returns polynomial NTT representation
        result[1] = uniformI; // ideally should return 256
        return result;
    }
}

/**
 * Abstract class for Kyber implementation
 */
class KyberService {
    /**
     * Default constructor that is called by the implementing Kyber service
     * @param paramsK
     */
    constructor(paramsK) {
        this.paramsK = paramsK;
        this.indcpa = new Indcpa(this.paramsK);
    }
    /**
     * Generate local Kyber Keys
     */
    generateKyberKeys() {
        // IND-CPA keypair
        const indcpakeys = this.indcpa.indcpaKeyGen();
        const pk = indcpakeys[0];
        const sk = indcpakeys[1];
        // FO transform to make IND-CCA2
        // get hash of pk
        const buffer1 = buffer.Buffer.from(pk);
        const hash1 = new sha3.SHA3(256);
        hash1.update(buffer1);
        let pkh = hash1.digest();
        // read 32 random values (0-255) into a 32 byte array
        const rnd = buffer.Buffer.alloc(KyberService.paramsSymBytes);
        for (let i = 0; i < KyberService.paramsSymBytes; i++) {
            rnd[i] = Utilities.nextInt(256);
        }
        // concatenate to form IND-CCA2 private key: sk + pk + h(pk) + rnd
        for (let i = 0; i < pk.length; i++) {
            sk.push(pk[i]);
        }
        for (let i = 0; i < pkh.length; i++) {
            sk.push(pkh[i]);
        }
        for (let i = 0; i < rnd.length; i++) {
            sk.push(rnd[i]);
        }
        const keys = []; // 2
        keys[0] = pk;
        keys[1] = sk;
        return keys;
    }
    /**
     * Generate a shared secret and cipher text from the given
     * public key
     * @param publicKey
     */
    encrypt(publicKey) {
        // random 32 bytes
        const m = buffer.Buffer.alloc(KyberService.paramsSymBytes);
        for (let i = 0; i < KyberService.paramsSymBytes; i++) {
            m[i] = Utilities.nextInt(256);
        }
        // hash m with SHA3-256
        const buffer1 = buffer.Buffer.from(m);
        const hash1 = new sha3.SHA3(256);
        hash1.update(buffer1);
        const mhBuf = hash1.digest();
        const mh = [];
        for (const val of mhBuf) {
            mh.push(val);
        }
        // hash pk with SHA3-256
        const buffer2 = buffer.Buffer.from(publicKey);
        const hash2 = new sha3.SHA3(256);
        hash2.update(buffer2);
        let pkh = hash2.digest();
        // hash mh and pkh with SHA3-512
        const buffer3 = buffer.Buffer.from(mh);
        const buffer4 = buffer.Buffer.from(pkh);
        const hash3 = new sha3.SHA3(512);
        hash3.update(buffer3).update(buffer4);
        const kr = hash3.digest();
        const kr1 = kr.slice(0, KyberService.paramsSymBytes);
        const kr2Buf = kr.slice(KyberService.paramsSymBytes, kr.length);
        const kr2 = [];
        for (const num of kr2Buf) {
            kr2.push(num);
        }
        // generate ciphertext c
        const cipherText = this.indcpa.indcpaEncrypt(publicKey, mh, kr2);
        // hash ciphertext with SHA3-256
        const buffer5 = buffer.Buffer.from(cipherText);
        const hash4 = new sha3.SHA3(256);
        hash4.update(buffer5);
        let ch = hash4.digest();
        // hash kr1 and ch with SHAKE-256
        const buffer6 = buffer.Buffer.from(kr1);
        const buffer7 = buffer.Buffer.from(ch);
        const hash5 = new sha3.SHAKE(256);
        hash5.update(buffer6).update(buffer7);
        const ssBuf = hash5.digest();
        // output (c, ss)
        const result = []; // 2
        result[0] = cipherText;
        const sharedSecret = [];
        for (let i = 0; i < KyberService.paramsSymBytes; ++i) {
            sharedSecret[i] = ssBuf[i];
        }
        result[1] = sharedSecret;
        return result;
    }
    /**
     * Decrypt the given cipher text to create the same shared secret with
     * the local private key
     * @param cipherText
     * @param privateKey
     */
    decrypt(cipherText, privateKey) {
        // extract sk, pk, pkh and z
        let startIndex = 0;
        let endIndex = 0;
        switch (this.paramsK) {
            case 2:
                endIndex = KyberService.paramsIndcpaSecretKeyBytesK512;
                break;
            case 3:
                endIndex = KyberService.paramsIndcpaSecretKeyBytesK768;
                break;
            default:
                endIndex = KyberService.paramsIndcpaSecretKeyBytesK1024;
        }
        const indcpaPrivateKey = privateKey.slice(startIndex, endIndex); // indcpa secret key
        startIndex = endIndex;
        switch (this.paramsK) {
            case 2:
                endIndex += KyberService.paramsIndcpaPublicKeyBytesK512;
                break;
            case 3:
                endIndex += KyberService.paramsIndcpaPublicKeyBytesK768;
                break;
            default:
                endIndex += KyberService.paramsIndcpaPublicKeyBytesK1024;
        }
        const indcpaPublicKey = privateKey.slice(startIndex, endIndex); // indcpa public key
        startIndex = endIndex;
        endIndex += KyberService.paramsSymBytes;
        const pkh = privateKey.slice(startIndex, endIndex); // sha3-256 hash
        startIndex = endIndex;
        endIndex += KyberService.paramsSymBytes;
        privateKey.slice(startIndex, endIndex);
        // IND-CPA decrypt
        const m = this.indcpa.indcpaDecrypt(cipherText, indcpaPrivateKey);
        // hash m and pkh with SHA3-512
        const buffer1 = buffer.Buffer.from(m);
        const buffer2 = buffer.Buffer.from(pkh);
        const hash1 = new sha3.SHA3(512);
        hash1.update(buffer1).update(buffer2);
        const krBuf = hash1.digest();
        const kr = [];
        for (const num of krBuf) {
            kr.push(num);
        }
        const kr1 = krBuf.slice(0, KyberService.paramsSymBytes);
        const kr2Buf = krBuf.slice(KyberService.paramsSymBytes, kr.length);
        const kr2 = [];
        for (const num of kr2Buf) {
            kr2.push(num);
        }
        // IND-CPA encrypt
        const cmp = this.indcpa.indcpaEncrypt(indcpaPublicKey, m, kr2);
        // compare c and cmp to verify the generated shared secret
        const fail = Utilities.constantTimeCompare(cipherText, cmp);
        // hash c with SHA3-256
        const md = new sha3.SHA3(256);
        md.update(buffer.Buffer.from(cipherText));
        const krh = md.digest();
        switch (this.paramsK) {
                    }
        let index = privateKey.length - KyberService.paramsSymBytes;
        for (let i = 0; i < KyberService.paramsSymBytes; i++) {
            kr[i] = Utilities.intToByte((kr[i]) ^ ((fail & 0xFF) & ((kr[i]) ^ (privateKey[index]))));
            index += 1;
        }
        let ctr = 0;
        for (ctr = 0; ctr < kr.length; ++ctr) {
            kr[ctr];
        }
        let ctr2 = 0;
        for (; ctr < krh.length; ++ctr) {
            krh[ctr2++];
        }
        const buffer3 = buffer.Buffer.from(cipherText);
        const hash2 = new sha3.SHA3(256);
        hash2.update(buffer3);
        let ch = hash2.digest();
        const buffer4 = buffer.Buffer.from(kr1);
        const buffer5 = buffer.Buffer.from(ch);
        const hash3 = new sha3.SHAKE(256);
        hash3.update(buffer4).update(buffer5);
        const ssBuf = hash3.digest();
        const sharedSecret = [];
        for (let i = 0; i < KyberService.paramsSymBytes; ++i) {
            sharedSecret[i] = ssBuf[i];
        }
        return sharedSecret;
    }
}
KyberService.nttZetas = [
    2285, 2571, 2970, 1812, 1493, 1422, 287, 202, 3158, 622, 1577, 182, 962,
    2127, 1855, 1468, 573, 2004, 264, 383, 2500, 1458, 1727, 3199, 2648, 1017,
    732, 608, 1787, 411, 3124, 1758, 1223, 652, 2777, 1015, 2036, 1491, 3047,
    1785, 516, 3321, 3009, 2663, 1711, 2167, 126, 1469, 2476, 3239, 3058, 830,
    107, 1908, 3082, 2378, 2931, 961, 1821, 2604, 448, 2264, 677, 2054, 2226,
    430, 555, 843, 2078, 871, 1550, 105, 422, 587, 177, 3094, 3038, 2869, 1574,
    1653, 3083, 778, 1159, 3182, 2552, 1483, 2727, 1119, 1739, 644, 2457, 349,
    418, 329, 3173, 3254, 817, 1097, 603, 610, 1322, 2044, 1864, 384, 2114, 3193,
    1218, 1994, 2455, 220, 2142, 1670, 2144, 1799, 2051, 794, 1819, 2475, 2459,
    478, 3221, 3021, 996, 991, 958, 1869, 1522, 1628
];
KyberService.nttZetasInv = [
    1701, 1807, 1460, 2371, 2338, 2333, 308, 108, 2851, 870, 854, 1510, 2535,
    1278, 1530, 1185, 1659, 1187, 3109, 874, 1335, 2111, 136, 1215, 2945, 1465,
    1285, 2007, 2719, 2726, 2232, 2512, 75, 156, 3000, 2911, 2980, 872, 2685,
    1590, 2210, 602, 1846, 777, 147, 2170, 2551, 246, 1676, 1755, 460, 291, 235,
    3152, 2742, 2907, 3224, 1779, 2458, 1251, 2486, 2774, 2899, 1103, 1275, 2652,
    1065, 2881, 725, 1508, 2368, 398, 951, 247, 1421, 3222, 2499, 271, 90, 853,
    1860, 3203, 1162, 1618, 666, 320, 8, 2813, 1544, 282, 1838, 1293, 2314, 552,
    2677, 2106, 1571, 205, 2918, 1542, 2721, 2597, 2312, 681, 130, 1602, 1871,
    829, 2946, 3065, 1325, 2756, 1861, 1474, 1202, 2367, 3147, 1752, 2707, 171,
    3127, 3042, 1907, 1836, 1517, 359, 758, 1441
];
KyberService.paramsN = 256;
KyberService.paramsQ = 3329;
KyberService.paramsQinv = 62209;
KyberService.paramsSymBytes = 32;
KyberService.paramsPolyBytes = 384;
KyberService.paramsETAK512 = 3;
KyberService.paramsETAK768K1024 = 2;
KyberService.paramsPolyvecBytesK512 = 2 * KyberService.paramsPolyBytes;
KyberService.paramsPolyvecBytesK768 = 3 * KyberService.paramsPolyBytes;
KyberService.paramsPolyvecBytesK1024 = 4 * KyberService.paramsPolyBytes;
KyberService.paramsPolyCompressedBytesK512 = 128;
KyberService.paramsPolyCompressedBytesK768 = 128;
KyberService.paramsPolyCompressedBytesK1024 = 160;
KyberService.paramsPolyvecCompressedBytesK512 = 2 * 320;
KyberService.paramsPolyvecCompressedBytesK768 = 3 * 320;
KyberService.paramsPolyvecCompressedBytesK1024 = 4 * 352;
KyberService.paramsIndcpaPublicKeyBytesK512 = KyberService.paramsPolyvecBytesK512 + KyberService.paramsSymBytes;
KyberService.paramsIndcpaPublicKeyBytesK768 = KyberService.paramsPolyvecBytesK768 + KyberService.paramsSymBytes;
KyberService.paramsIndcpaPublicKeyBytesK1024 = KyberService.paramsPolyvecBytesK1024 + KyberService.paramsSymBytes;
KyberService.paramsIndcpaSecretKeyBytesK512 = 2 * KyberService.paramsPolyBytes;
KyberService.paramsIndcpaSecretKeyBytesK768 = 3 * KyberService.paramsPolyBytes;
KyberService.paramsIndcpaSecretKeyBytesK1024 = 4 * KyberService.paramsPolyBytes;
// Kyber512SKBytes is a constant representing the byte length of private keys in Kyber-512
KyberService.Kyber512SKBytes = KyberService.paramsPolyvecBytesK512 + ((KyberService.paramsPolyvecBytesK512 + KyberService.paramsSymBytes) + 2 * KyberService.paramsSymBytes);
// Kyber768SKBytes is a constant representing the byte length of private keys in Kyber-768
KyberService.Kyber768SKBytes = KyberService.paramsPolyvecBytesK768 + ((KyberService.paramsPolyvecBytesK768 + KyberService.paramsSymBytes) + 2 * KyberService.paramsSymBytes);
// Kyber1024SKBytes is a constant representing the byte length of private keys in Kyber-1024
KyberService.Kyber1024SKBytes = KyberService.paramsPolyvecBytesK1024 + ((KyberService.paramsPolyvecBytesK1024 + KyberService.paramsSymBytes) + 2 * KyberService.paramsSymBytes);
// Kyber512PKBytes is a constant representing the byte length of public keys in Kyber-512
KyberService.Kyber512PKBytes = KyberService.paramsPolyvecBytesK512 + KyberService.paramsSymBytes;
// Kyber768PKBytes is a constant representing the byte length of public keys in Kyber-768
KyberService.Kyber768PKBytes = KyberService.paramsPolyvecBytesK768 + KyberService.paramsSymBytes;
// Kyber1024PKBytes is a constant representing the byte length of public keys in Kyber-1024
KyberService.Kyber1024PKBytes = KyberService.paramsPolyvecBytesK1024 + KyberService.paramsSymBytes;
// KyberEncoded512PKBytes is a constant representing the byte length of encoded public keys in Kyber-512
KyberService.KyberEncoded512PKBytes = 967;
// KyberEncoded768PKBytes is a constant representing the byte length of encoded public keys in Kyber-768
KyberService.KyberEncoded768PKBytes = 1351;
// KyberEncoded1024PKBytes is a constant representing the byte length of encoded public keys in Kyber-1024
KyberService.KyberEncoded1024PKBytes = 1735;
// Kyber512CTBytes is a constant representing the byte length of ciphertexts in Kyber-512
KyberService.Kyber512CTBytes = KyberService.paramsPolyvecCompressedBytesK512 + KyberService.paramsPolyCompressedBytesK512;
// Kyber768CTBytes is a constant representing the byte length of ciphertexts in Kyber-768
KyberService.Kyber768CTBytes = KyberService.paramsPolyvecCompressedBytesK768 + KyberService.paramsPolyCompressedBytesK768;
// Kyber1024CTBytes is a constant representing the byte length of ciphertexts in Kyber-1024
KyberService.Kyber1024CTBytes = KyberService.paramsPolyvecCompressedBytesK1024 + KyberService.paramsPolyCompressedBytesK1024;
// KyberEncoded512CTBytes is a constant representing the byte length of Encoded ciphertexts in Kyber-512
KyberService.KyberEncoded512CTBytes = 935;
// KyberEncoded768CTBytes is a constant representing the byte length of Encoded ciphertexts in Kyber-768
KyberService.KyberEncoded768CTBytes = 1255;
// KyberEncoded1024CTBytes is a constant representing the byte length of Encoded ciphertexts in Kyber-1024
KyberService.KyberEncoded1024CTBytes = 1735;
// KyberSSBytes is a constant representing the byte length of shared secrets in Kyber
KyberService.KyberSSBytes = 32;
// KyberEncodedSSBytes is a constant representing the byte length of encoded shared secrets in Kyber
KyberService.KyberEncodedSSBytes = 193;

/**
 * Kyber KEM 512 implementation
 */
class Kyber512Service extends KyberService {
    constructor() {
        super(Kyber512Service.paramsK);
    }
    /**
     * String representation of the Kyber version
     */
    getAlgorithm() {
        return "Kyber512";
    }
}
// Indicates the Kyber version to the rest of the algorithm
Kyber512Service.paramsK = 2;

/**
 * Kyber KEM 768 implementation
 */
class Kyber768Service extends KyberService {
    constructor() {
        super(Kyber768Service.paramsK);
    }
    /**
     * String representation of the Kyber version
     */
    getAlgorithm() {
        return "Kyber768";
    }
}
// Indicates the Kyber version to the rest of the algorithm
Kyber768Service.paramsK = 3;

/**
 * Kyber KEM 1024 implementation
 */
class Kyber1024Service extends KyberService {
    constructor() {
        super(Kyber1024Service.paramsK);
    }
    /**
     * String representation of the Kyber version
     */
    getAlgorithm() {
        return "Kyber1024";
    }
}
// Indicates the Kyber version to the rest of the algorithm
Kyber1024Service.paramsK = 4;

/**
 * Kyber Handshake
 */
class KyberHandshake {
    constructor(kyberService) {
        this.kyberService = kyberService;
        this._publicKey = [];
        this._privateKey = [];
        this._remotePublicKey = [];
        this._cipherText = [];
        this._sharedSecret = [];
        this._remoteSharedSecret = [];
        this._remoteCipherText = [];
    }
    /**
     * Process the remote public key to create a cipher text and shared
     * secret
     * @param remotePublicKey
     * @return cipherText
     */
    generateCipherTextAndSharedSecret(remotePublicKey) {
        this.remotePublicKey = remotePublicKey;
        const sharedSecretCipher = this.kyberService.encrypt(remotePublicKey);
        this.cipherText = sharedSecretCipher[0];
        this.sharedSecret = sharedSecretCipher[1];
        return this.cipherText;
    }
    /**
     * Process the remote cipher text to generate the same shared
     * secret
     * @param remoteCipherText
     * @return remoteSharedSecret
     */
    generateRemoteSharedSecret(remoteCipherText) {
        this.remoteCipherText = remoteCipherText;
        this.remoteSharedSecret = this.kyberService.decrypt(remoteCipherText, this.privateKey);
        return this.remoteSharedSecret;
    }
    get sharedSecret() {
        return this._sharedSecret;
    }
    set sharedSecret(value) {
        this._sharedSecret = value;
    }
    get publicKey() {
        return this._publicKey;
    }
    set publicKey(value) {
        this._publicKey = value;
    }
    get remoteSharedSecret() {
        return this._remoteSharedSecret;
    }
    set remoteSharedSecret(value) {
        this._remoteSharedSecret = value;
    }
    get cipherText() {
        return this._cipherText;
    }
    set cipherText(value) {
        this._cipherText = value;
    }
    get remoteCipherText() {
        return this._remoteCipherText;
    }
    set remoteCipherText(value) {
        this._remoteCipherText = value;
    }
    get privateKey() {
        return this._privateKey;
    }
    set privateKey(value) {
        this._privateKey = value;
    }
    get remotePublicKey() {
        return this._remotePublicKey;
    }
    set remotePublicKey(value) {
        this._remotePublicKey = value;
    }
}

/*
 * Public API Surface of crystals-kyber-ts
 */
class Kyber512Handshake extends KyberHandshake {
    constructor() {
        super(new Kyber512Service());
    }
}
class Kyber768Handshake extends KyberHandshake {
    constructor() {
        super(new Kyber768Service());
    }
}
class Kyber1024Handshake extends KyberHandshake {
    constructor() {
        super(new Kyber1024Service());
    }
}

// /**
// * Generate 2 key agreements, one for Bob and one for Alice
// */
// const bobHandshake = new Kyber1024Handshake();
// const aliceHandshake = new Kyber1024Handshake();
// const [bpk,bsk] = bobHandshake.kyberService.generateKyberKeys();
// bobHandshake.privateKey = bsk;
// bobHandshake.publicKey = bpk;
// const [apk,ask] = aliceHandshake.kyberService.generateKyberKeys();
// aliceHandshake.privateKey = ask;
// aliceHandshake.publicKey = apk;
// /**
// * Send Bob's public key to Alice and generate the Cipher Text and Shared Secret
// */
// const bobPublicKey: number[] = bobHandshake.publicKey;
// const aliceCipherText: number[] = aliceHandshake.generateCipherTextAndSharedSecret(bobPublicKey);
// const aliceSharedSecret = aliceHandshake.generateRemoteSharedSecret(aliceCipherText);
// /**
// * Send the cipher text generated from Bob's public key to Bob so that he
// * can generate the same remote shared secret
// */
// const bobSharedSecret: number[] = bobHandshake.generateRemoteSharedSecret(aliceCipherText);
// console.log(bobSharedSecret);
var index = {
    Kyber1024Handshake, Kyber512Handshake, Kyber768Handshake, Buffer: buffer.Buffer
};

export { index as default };
