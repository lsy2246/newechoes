let wasm;

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

export function start() {
    wasm.start();
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

const BoundingBoxFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_boundingbox_free(ptr >>> 0, 1));

export class BoundingBox {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BoundingBoxFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_boundingbox_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get min_x() {
        const ret = wasm.__wbg_get_boundingbox_min_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set min_x(arg0) {
        wasm.__wbg_set_boundingbox_min_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get min_y() {
        const ret = wasm.__wbg_get_boundingbox_min_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set min_y(arg0) {
        wasm.__wbg_set_boundingbox_min_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get min_z() {
        const ret = wasm.__wbg_get_boundingbox_min_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set min_z(arg0) {
        wasm.__wbg_set_boundingbox_min_z(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_x() {
        const ret = wasm.__wbg_get_boundingbox_max_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set max_x(arg0) {
        wasm.__wbg_set_boundingbox_max_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_y() {
        const ret = wasm.__wbg_get_boundingbox_max_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set max_y(arg0) {
        wasm.__wbg_set_boundingbox_max_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_z() {
        const ret = wasm.__wbg_get_boundingbox_max_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set max_z(arg0) {
        wasm.__wbg_set_boundingbox_max_z(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} min_x
     * @param {number} min_y
     * @param {number} min_z
     * @param {number} max_x
     * @param {number} max_y
     * @param {number} max_z
     */
    constructor(min_x, min_y, min_z, max_x, max_y, max_z) {
        const ret = wasm.boundingbox_new(min_x, min_y, min_z, max_x, max_y, max_z);
        this.__wbg_ptr = ret >>> 0;
        BoundingBoxFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Vector3} point
     * @returns {number}
     */
    distance_to_point(point) {
        _assertClass(point, Vector3);
        const ret = wasm.boundingbox_distance_to_point(this.__wbg_ptr, point.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_size() {
        const ret = wasm.boundingbox_get_size(this.__wbg_ptr);
        return ret;
    }
}

const GeoProcessorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_geoprocessor_free(ptr >>> 0, 1));

export class GeoProcessor {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GeoProcessorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_geoprocessor_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.geoprocessor_new();
        this.__wbg_ptr = ret >>> 0;
        GeoProcessorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} lat
     * @param {number} lon
     * @param {number} radius
     * @returns {Vector3}
     */
    lat_long_to_vector3(lat, lon, radius) {
        const ret = wasm.geoprocessor_lat_long_to_vector3(this.__wbg_ptr, lat, lon, radius);
        return Vector3.__wrap(ret);
    }
    /**
     * @param {string} world_json
     * @param {string} china_json
     * @param {string} visited_places_json
     * @param {number} scale
     */
    process_geojson(world_json, china_json, visited_places_json, scale) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(world_json, wasm.__wbindgen_export_1, wasm.__wbindgen_export_2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(china_json, wasm.__wbindgen_export_1, wasm.__wbindgen_export_2);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(visited_places_json, wasm.__wbindgen_export_1, wasm.__wbindgen_export_2);
            const len2 = WASM_VECTOR_LEN;
            wasm.geoprocessor_process_geojson(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, scale);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {number} point_x
     * @param {number} point_y
     * @param {number} point_z
     * @param {number} _radius
     * @returns {string | undefined}
     */
    find_nearest_country(point_x, point_y, point_z, _radius) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.geoprocessor_find_nearest_country(retptr, this.__wbg_ptr, point_x, point_y, point_z, _radius);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_0(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {any}
     */
    get_boundary_lines() {
        const ret = wasm.geoprocessor_get_boundary_lines(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {any}
     */
    get_regions() {
        const ret = wasm.geoprocessor_get_regions(this.__wbg_ptr);
        return takeObject(ret);
    }
}

const Vector3Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_vector3_free(ptr >>> 0, 1));

export class Vector3 {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Vector3.prototype);
        obj.__wbg_ptr = ptr;
        Vector3Finalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        Vector3Finalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_vector3_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_boundingbox_min_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_boundingbox_min_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_boundingbox_min_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_boundingbox_min_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_boundingbox_min_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_boundingbox_min_z(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x, y, z) {
        const ret = wasm.vector3_new(x, y, z);
        this.__wbg_ptr = ret >>> 0;
        Vector3Finalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_export_0(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_new_405e22f390576ce2 = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_5e0be73521bc8c17 = function() {
        const ret = new Map();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_78feb108b6472713 = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_37837023f3d740e8 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_8fc6bf8a5b1071d1 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_1, wasm.__wbindgen_export_2);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('geo_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
