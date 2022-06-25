
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const discipline = writable("TRI");
    const disciplineToColor = (discipline) => {
      const table = {
        TRI: "pink",
        DMT: "blue",
        TUM: "purple",
      };
      return table[discipline];
    };

    /* src\InputBar.svelte generated by Svelte v3.48.0 */

    const { console: console_1$2 } = globals;
    const file$4 = "src\\InputBar.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let div;
    	let input0;
    	let input0_class_value;
    	let t0;
    	let input1;
    	let t1;
    	let label0;
    	let t2;
    	let label0_class_value;
    	let t3;
    	let input2;
    	let t4;
    	let label1;
    	let t5;
    	let label1_class_value;
    	let t6;
    	let input3;
    	let t7;
    	let label2;
    	let t8;
    	let label2_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			label0 = element("label");
    			t2 = text("TRI");
    			t3 = space();
    			input2 = element("input");
    			t4 = space();
    			label1 = element("label");
    			t5 = text("DMT");
    			t6 = space();
    			input3 = element("input");
    			t7 = space();
    			label2 = element("label");
    			t8 = text("TUM");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "FigIN");
    			attr_dev(input0, "class", input0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"));
    			add_location(input0, file$4, 28, 4, 810);
    			input1.__value = "TRI";
    			input1.value = input1.__value;
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "id", "TRI");
    			attr_dev(input1, "name", "event");
    			attr_dev(input1, "class", "radioElement svelte-seovcc");
    			input1.checked = true;
    			/*$$binding_groups*/ ctx[6][0].push(input1);
    			add_location(input1, file$4, 35, 4, 950);
    			attr_dev(label0, "for", "TRI");
    			attr_dev(label0, "class", label0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"));
    			add_location(label0, file$4, 45, 4, 1148);
    			input2.__value = "DMT";
    			input2.value = input2.__value;
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "id", "DMT");
    			attr_dev(input2, "name", "event");
    			attr_dev(input2, "class", "radioElement svelte-seovcc");
    			/*$$binding_groups*/ ctx[6][0].push(input2);
    			add_location(input2, file$4, 46, 4, 1201);
    			attr_dev(label1, "for", "DMT");
    			attr_dev(label1, "class", label1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"));
    			add_location(label1, file$4, 55, 4, 1384);
    			input3.__value = "TUM";
    			input3.value = input3.__value;
    			attr_dev(input3, "type", "radio");
    			attr_dev(input3, "id", "TUM");
    			attr_dev(input3, "name", "event");
    			attr_dev(input3, "class", "radioElement svelte-seovcc");
    			/*$$binding_groups*/ ctx[6][0].push(input3);
    			add_location(input3, file$4, 56, 4, 1437);
    			attr_dev(label2, "for", "TUM");
    			attr_dev(label2, "class", label2_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"));
    			add_location(label2, file$4, 65, 4, 1620);
    			attr_dev(div, "id", "inputDiv");
    			attr_dev(div, "class", "svelte-seovcc");
    			add_location(div, file$4, 27, 2, 785);
    			add_location(main, file$4, 26, 0, 775);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, input0);
    			set_input_value(input0, /*curFIG*/ ctx[1]);
    			append_dev(div, t0);
    			append_dev(div, input1);
    			input1.checked = input1.__value === /*$discipline*/ ctx[0];
    			append_dev(div, t1);
    			append_dev(div, label0);
    			append_dev(label0, t2);
    			append_dev(div, t3);
    			append_dev(div, input2);
    			input2.checked = input2.__value === /*$discipline*/ ctx[0];
    			append_dev(div, t4);
    			append_dev(div, label1);
    			append_dev(label1, t5);
    			append_dev(div, t6);
    			append_dev(div, input3);
    			input3.checked = input3.__value === /*$discipline*/ ctx[0];
    			append_dev(div, t7);
    			append_dev(div, label2);
    			append_dev(label2, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input0, "keypress", /*newSkill*/ ctx[3], false, false, false),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[5]),
    					listen_dev(input1, "change", /*newSkill*/ ctx[3], false, false, false),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[7]),
    					listen_dev(input2, "change", /*newSkill*/ ctx[3], false, false, false),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[8]),
    					listen_dev(input3, "change", /*newSkill*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*colorClass*/ 4 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"))) {
    				attr_dev(input0, "class", input0_class_value);
    			}

    			if (dirty & /*curFIG*/ 2 && input0.value !== /*curFIG*/ ctx[1]) {
    				set_input_value(input0, /*curFIG*/ ctx[1]);
    			}

    			if (dirty & /*$discipline*/ 1) {
    				input1.checked = input1.__value === /*$discipline*/ ctx[0];
    			}

    			if (dirty & /*colorClass*/ 4 && label0_class_value !== (label0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"))) {
    				attr_dev(label0, "class", label0_class_value);
    			}

    			if (dirty & /*$discipline*/ 1) {
    				input2.checked = input2.__value === /*$discipline*/ ctx[0];
    			}

    			if (dirty & /*colorClass*/ 4 && label1_class_value !== (label1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"))) {
    				attr_dev(label1, "class", label1_class_value);
    			}

    			if (dirty & /*$discipline*/ 1) {
    				input3.checked = input3.__value === /*$discipline*/ ctx[0];
    			}

    			if (dirty & /*colorClass*/ 4 && label2_class_value !== (label2_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-seovcc"))) {
    				attr_dev(label2, "class", label2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*$$binding_groups*/ ctx[6][0].splice(/*$$binding_groups*/ ctx[6][0].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[6][0].splice(/*$$binding_groups*/ ctx[6][0].indexOf(input2), 1);
    			/*$$binding_groups*/ ctx[6][0].splice(/*$$binding_groups*/ ctx[6][0].indexOf(input3), 1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let colorClass;
    	let $discipline;
    	validate_store(discipline, 'discipline');
    	component_subscribe($$self, discipline, $$value => $$invalidate(0, $discipline = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InputBar', slots, []);
    	const dispatch = createEventDispatcher();
    	let curFIG = "";
    	let newSkillFlag = true;

    	const newSkill = function (e) {
    		console.log(e.type);

    		if (e.key == "Enter") {
    			e.preventDefault();
    			e.stopPropagation();
    			newSkillFlag = false;
    			dispatch("new_skill", { curFIG, discipline: get_store_value(discipline) });
    		} else if (e.type == "change" && !newSkillFlag) {
    			e.preventDefault();
    			e.stopPropagation();
    			dispatch("new_skill", { curFIG, discipline: get_store_value(discipline) });
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<InputBar> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input0_input_handler() {
    		curFIG = this.value;
    		$$invalidate(1, curFIG);
    	}

    	function input1_change_handler() {
    		$discipline = this.__value;
    		discipline.set($discipline);
    	}

    	function input2_change_handler() {
    		$discipline = this.__value;
    		discipline.set($discipline);
    	}

    	function input3_change_handler() {
    		$discipline = this.__value;
    		discipline.set($discipline);
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		discipline,
    		disciplineToColor,
    		get: get_store_value,
    		dispatch,
    		curFIG,
    		newSkillFlag,
    		newSkill,
    		colorClass,
    		$discipline
    	});

    	$$self.$inject_state = $$props => {
    		if ('curFIG' in $$props) $$invalidate(1, curFIG = $$props.curFIG);
    		if ('newSkillFlag' in $$props) newSkillFlag = $$props.newSkillFlag;
    		if ('colorClass' in $$props) $$invalidate(2, colorClass = $$props.colorClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$discipline*/ 1) {
    			$$invalidate(2, colorClass = disciplineToColor($discipline));
    		}
    	};

    	return [
    		$discipline,
    		curFIG,
    		colorClass,
    		newSkill,
    		input0_input_handler,
    		input1_change_handler,
    		$$binding_groups,
    		input2_change_handler,
    		input3_change_handler
    	];
    }

    class InputBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputBar",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    class Skill {
      quarterFlips = 0;
      twistsArr = [];
      shape = "/"; //straight by default
      backward = false;
      discipline = "TRI";
      ddString = "";
      twistsTotal = 0;
      strongBackwards = undefined;
      guessedBackwards = false;
      DD = 0;
      name = "";
      constructor(ddStringIn, eventIn) {
        this.ddStringPermanent = ddStringIn;
        this.ddString = ddStringIn.replaceAll("-", "0");
        this.discipline = eventIn;
        if (this.ddString.includes(".") || "h(".includes(ddStringIn)) {
          this.strongBackwards = false;
          if (this.ddString.includes(".")) {
            this.ddString = this.ddString.substring(1);
          }
        } else {
          if (eventIn == "TUM") {
            this.strongBackwards = true;
          }
        }
        if (this.ddString.includes("/")) {
          this.shape = "/";
          this.ddString = this.ddString.slice(0, -1);
        } else if (this.ddString.includes("o")) {
          this.shape = "o";
          this.ddString = this.ddString.slice(0, -1);
        } else if (this.ddString.includes("<")) {
          this.shape = "<";
          this.ddString = this.ddString.slice(0, -1);
        }
        if (this.discipline == "TUM") {
          if ("hf^(".includes(ddStringIn)) {
            this.ddString = ddStringIn;
          } else {
            this.quarterFlips = 4 * this.ddString.length;
            for (var i = 0; i < this.ddString.length; i++) {
              this.twistsArr.push(parseInt(this.ddString[i]));
            }
            this.ddString = "" + this.quarterFlips;
            for (var i = 0; i < this.twistsArr.length; i++) {
              this.ddString += "" + this.twistsArr[i];
            }
            this.ddString += this.shape;
            this.ddString = this.ddString.replaceAll("0", "-");
          }
        } else {
          if (this.ddString.length == 2) {
            this.quarterFlips = parseInt(this.ddString.substring(0, 1));
            this.twistsArr = [parseInt(this.ddString.substring(1, 2))];
          } else if (this.ddString.length == 3) {
            //quintuple-full edge case (fix later?)
            this.quarterFlips = parseInt(this.ddString.substring(0, 1));
            this.twistsArr = [
              parseInt(this.ddString.substring(1, 2)),
              parseInt(this.ddString.substring(2, 3)),
            ];
          } else {
            this.quarterFlips = parseInt(this.ddString.substring(0, 2));
            this.ddString = this.ddString.substring(2);
            for (var i = 0; i < this.ddString.length; i++) {
              this.twistsArr.push(parseInt(this.ddString.substring(i, i + 1)));
            }
          }
        }

        if (this.strongBackwards != undefined) {
          this.backward = this.strongBackwards;
        } else {
          var twistsTotalA = 0;
          for (var i = 0; i < this.twistsArr.length; i++) {
            twistsTotalA += this.twistsArr[i];
          }
          this.backward = twistsTotalA % 2 == 0;
        }

        for (var i = 0; i < this.twistsArr.length; i++) {
          this.twistsTotal += this.twistsArr[i];
        }

        this.guessedBackwards = this.twistsTotal % 2 == 0;

        if (ddStringIn == "^") {
          this.quarterFlips = 4;
          this.twistsArr = [0];
        }

        this.DD = this.calculateDD();
        this.name = this.getName();
      }

      calculateDD() {
        var dd = 0;
        var twistsTotal = 0;
        for (var i = 0; i < this.twistsArr.length; i++) {
          twistsTotal += this.twistsArr[i];
        }
        var flips = Math.floor(this.quarterFlips / 4);

        if (this.discipline.toUpperCase() == "TRI") {
          dd = this.quarterFlips * 0.1 + 0.1 * twistsTotal;

          //complete flip bonuses
          if (flips == 0) ; else if (flips == 1) {
            dd += 0.1;
          } else if (flips == 2) {
            dd += 0.2;
          } else if (flips == 3) {
            dd += 0.4;
          } else if (flips == 4) {
            dd += 0.6;
          } else {
            //edge case
            //talk do judge about what to do here
            dd += 0.2 + 0.2 * flips;
          }

          if (flips == 0 || this.shape == "o") ; else if (
            flips == 1 &&
            (this.shape == "/" || this.shape == "<") &&
            twistsTotal == 0
          ) {
            dd += 0.1;
          } else if (flips != 1) {
            dd += 0.1 * flips;
          }

          //that's it? I hope?
        } else if (this.discipline.toUpperCase() == "DMT") {
          if (this.quarterFlips % 4 !== 0) {
            console.log("All DMT skills must be full flips");
            return undefined;
          }

          if (flips == 0) {
            dd = twistsTotal * 0.2;
          } else if (flips == 1) {
            dd += 0.5;
            if (twistsTotal == 0) {
              if (!(this.shape == "o")) {
                dd += 0.1;
              }
            } else {
              if (twistsTotal <= 2) {
                dd += 0.2 * twistsTotal;
              } else if (twistsTotal <= 4) {
                dd += 0.2 * 2 + 0.3 * (twistsTotal - 2);
              } else if (twistsTotal <= 6) {
                dd += 0.2 * 2 + 0.3 * 2 + 0.4 * (twistsTotal - 4);
              } else if (twistsTotal <= 8) {
                dd += 0.2 * 2 + 0.3 * 2 + 0.4 * 2 + 0.5 * (twistsTotal - 6);
              }
            }
          } else {
            //raw calculation
            dd += (twistsTotal * 0.2 + flips * 0.5) * flips;
            //bonuses
            if (this.shape == "<") {
              if (flips == 2) {
                dd += 0.4;
              } else if (flips == 3) {
                dd += 0.8;
              } else if (flips == 4) {
                dd += 1.6;
              } else {
                //edge case?? ask judge how this would be calculated
                dd += 1.6 + (flips - 4) * 0.4;
              }
            } else if (this.shape == "/") {
              if (flips == 2) {
                dd += 0.8;
              } else if (flips == 3) {
                dd += 1.6;
              } else {
                //edge case?? ask judge how this would be calculated
                dd += 1.6 + (flips - 3) * 0.8;
              }
            }
            //should the twists be outside of this bracket?
          }
        } else if (this.discipline.toUpperCase() == "TUM") {
          if (this.ddString == "(") {
            dd = 0.1;
          } else if (this.ddString == "h") {
            dd = 0.1;
          } else if (this.ddString == "f") {
            dd = 0.1;
          } else if (this.ddString == "^") {
            dd = 0.2;
          } else {
            if (this.quarterFlips == 4) {
              if (twistsTotal == 0) {
                dd = Math.floor(this.quarterFlips / 4) * 0.5;
                if (this.shape == "<" || this.shape == "/") {
                  dd += 0.1;
                }
                //tumbling force backward?
                if (!this.backward) {
                  dd += 0.1;
                }
              } else {
                dd = Math.floor(this.quarterFlips / 4) * 0.5;
                if (this.twistsTotal <= 4) {
                  dd += 0.2 * twistsTotal;
                } else if (this.twistsTotal <= 6) {
                  dd += 0.2 * 4 + 0.3 * (twistsTotal - 4);
                } else {
                  dd += 0.2 * 4 + 0.3 * 2 + 0.4 * (twistsTotal - 6);
                }
                if (!this.backward) {
                  dd += 0.1;
                }
              }
            } else if (this.quarterFlips == 8) {
              dd = Math.floor(this.quarterFlips / 4) * 0.5;
              if (this.twistsTotal <= 2) {
                dd += 0.1 * twistsTotal;
              } else if (this.twistsTotal <= 4) {
                dd += 0.1 * 2 + 0.2 * (twistsTotal - 2);
              } else if (this.twistsTotal <= 6) {
                dd += 0.1 * 2 + 0.2 * 2 + 0.3 * (twistsTotal - 4);
              } else {
                dd += 0.1 * 2 + 0.2 * 2 + 0.3 * 2 + 0.4 * (twistsTotal - 6);
              }
              if (this.shape == "<") {
                dd += 0.1;
              } else if (this.shape == "/") {
                dd += 0.2;
              }
              if (!this.backward) {
                dd += 0.2;
              }
              dd = dd * 2;
            } else if (this.quarterFlips == 12) {
              dd = Math.floor(this.quarterFlips / 4) * 0.5;
              if (this.twistsTotal <= 2) {
                dd += 0.3 * twistsTotal;
              } else {
                dd += 0.3 * 2 + 0.4 * (twistsTotal - 2);
              }
              if (this.shape == "<") {
                dd += 0.2;
              } else if (this.shape == "/") {
                dd += 0.4;
              }
              if (!this.backward) {
                dd += 0.3;
              }
              dd = dd * 3;
            } else {
              dd = Math.floor(this.quarterFlips / 4) * 0.5;
              if (this.shape == "<") {
                dd += 0.3;
              }
              if (!this.backward) {
                dd += 0.1 * Math.floor(this.quarterFlips / 4);
              }
              dd = dd * Math.floor(this.quarterFlips / 4);
            }
          }
        } else {
          throw "Invalid event (how did this even happen)";
        }
        return Math.round(dd * 10) / 10;
      }

      getName() {
        var name = "";
        if (this.discipline == "TUM") {
          if (this.ddString == "(") {
            return "Roundoff";
          } else if (this.ddString == "^") {
            return "Whip";
          } else if (this.ddString == "h") {
            return "Front Handspring";
          } else if (this.ddString == "f") {
            return "Back Handspring";
          }
          console.log(this.ddString);
          try {
            if (this.guessedBackwards != this.backward) {
              name = skillsArr.find(
                (element) =>
                  this.ddString.includes(element[0]) &&
                  this.ddString.length - element[0].length == 1
              )[3];
            } else {
              name = skillsArr.find(
                (element) =>
                  this.ddString.includes(element[0]) &&
                  this.ddString.length - element[0].length == 1
              )[2];
            }
          } catch (eRr) {}

          try {
            if (
              skillsArr.find((element) => this.ddString.includes(element[0]))[1] ==
              1
            ) {
              name += " " + shapeToString(this.shape);
            } else {
              if ("^(hf".includes(this.ddString)) {
                this.shape = "n/a";
              } else {
                this.shape = "/";
              }
            }
          } catch (error) {
            console.log(error);
          }
        } else {
          try {
            if (this.guessedBackwards != this.backward) {
              name = skillsArr.find(
                (element) =>
                  this.ddStringPermanent.includes(element[0]) &&
                  this.ddStringPermanent.length - element[0].length == 1
              )[3];
            } else {
              name = skillsArr.find(
                (element) =>
                  this.ddStringPermanent.includes(element[0]) &&
                  this.ddStringPermanent.length - element[0].length == 1
              )[2];
            }
          } catch (err) {
            console.log(err);
          }

          try {
            if (
              skillsArr.find((element) =>
                this.ddStringPermanent.includes(element[0])
              )[1] == 1
            ) {
              name += " " + shapeToString(this.shape);
            } else {
              this.shape = "/";
            }
          } catch (error) {
            console.log(error);
          }
        }
        return name;
      }

      printInfo() {
        console.log("DDString: " + this.ddStringPermanent);
        console.log("Shape: " + this.shape);
        console.log("Backward: " + this.backward);
        console.log("Event: " + this.event);
        console.log("QuarterFlips: " + this.quarterFlips);
        console.log("Twists: " + this.twistsArr);
      }
    }

    const skillsArr = [
      ["^", 0, "Whip", "Whip"],
      ["(", 0, "Roundoff", "Roundoff"],
      ["f", 0, "Back Handspring", "Back Handspring"],
      ["h", 0, "Front Handspring", "Front Handspring"],
      ["4-", 1, "Back", "Front"],
      ["41", 1, "Barani", "Back half"],
      ["42", 0, "Back Full", "Front Full"],
      ["43", 0, "Rudi", "Back 3/2"],
      ["44", 0, "Double Full", "Double front full"],
      ["45", 0, "Randi", "Back 5/2"],
      ["46", 0, "Triple Full", "Triple front Full"],
      ["47", 0, "Adolf", "Back 7/2"],
      ["48", 0, "Quadruple Full", "Quadruple front full"],
      ["8--", 1, "Double", "Double front"],
      ["81-", 1, "Half-in", "Arabian Double Front"],
      ["8-1", 1, "Half-out", "Biles"],
      ["82-", 1, "Full-in", "Front full-in"],
      ["8-2", 1, "Full-out", "Front full-out"],
      ["821", 1, "Full-half", "Full-in Half-out"],
      ["812", 1, "Half-full", "Half-full"],
      ["811", 1, "Half-half", "Front half-half"],
      ["822", 1, "Full-Full", "Front full-full"],
      ["83-", 1, "Rudi-in", "3/2-in back"],
      ["8-3", 1, "Rudi-out", "3/2-out back"],
      ["8-4", 1, "Double full out", "Front double full out"],
      ["813", 1, "Half-rudi"],
      ["831", 1, "Full-full"],
      ["84-", 1, "Double full in", "Front double full in"],
      ["85-", 1, "Randi-in", "5/2-in back"],
      ["841", 1, "Full-rudi", "Full-3/2"],
      ["832", 1, "Full-rudi", "Full-3/3"],
      ["823", 1, "Full-rudi", "Full-3/4"],
      ["814", 1, "Full-rudi", "Full-3/5"],
      ["8-5", 1, "Randi-out", "5/2-out back"],
      ["815", 1, "Half-randi"],
      ["824", 1, "Miller", "Front miller"],
      ["833", 1, "Miller", "Front miller"],
      ["842", 1, "Miller", "Front miller"],
      ["851", 1, "Miller", "Front miller"],
      ["825", 1, "Full-randi", "Vachon"],
      ["834", 1, "Full-randi", "Vachon"],
      ["843", 1, "Full-randi", "Vachon"],
      ["852", 1, "Full-randi", "Vachon"],
      ["826", 1, "Miller Plus", "Front Miller Plus"],
      ["835", 1, "Miller Plus", "Front Miller Plus"],
      ["844", 1, "Miller Plus", "Front Miller Plus"],
      ["853", 1, "Miller Plus", "Front Miller Plus"],
      ["862", 1, "Miller Plus", "Front Miller Plus"],
      ["855", 1, "Miller Plus Plus", "Front Miller Plus Plus"],
      ["12---", 1, "Triple", "Triple front"],
      ["121--", 1, "Half-in triple", "Arabian Triple Front"],
      ["12-1-", 1, "Fliffus-in "],
      ["12--1", 1, "Triff", "Triple back half-out"],
      ["1211-", 1, "Half-half-in"],
      ["121-1", 1, "Half-triff"],
      ["12-11", 1, "Half-half-out"],
      ["122--", 1, "Full-in triple", "Full-in triple front"],
      ["12-2-", 1, "Back-full-back"],
      ["12-21", 1, "Front-full-half"],
      ["12--2", 1, "Full-out triple"],
      ["12--3", 1, "Triff Rudi-out"],
      ["122-1", 1, "Full-front-half", "Full-in triple half out"],
      ["12111", 1, "Half-half-half"],
      ["1221-", 1, "Full-half-in"],
      ["1222-", 1, "Full-full-in"],
      ["122-2", 1, "Full-back-full"],
      ["12-22", 1, "Full-full-out"],
      ["121-3", 1, "Half-triff-rudi"],
      ["123-1", 1, "3/2-in triff"],
      ["122-3", 1, "Full-front-rudi"],
      ["12-23", 1, "Front-full-rudi"],
      ["12--5", 1, "Triff-randi"],
      ["12221", 1, "Full-full-half"],
      ["12222", 1, "Full-full-full"],
      ["16----", 1, "Quadruple", "Quadruple front"],
      ["16---1", 1, "Quadriffus"],
      ["16---3", 1, "Quadriffus-rudi"],
      ["162--1", 1, "Full-front-front-half"],
      ["162---", 1, "Full-in quadruple"],
      ["161---1", 1, "Half-qaudriffus"],
    ];

    var shapeToString = function (shape) {
      if (shape == "o") {
        return "tuck";
      } else if (shape == "<") {
        return "pike";
      } else if (shape == "/") {
        return "layout";
      } else {
        // throw("????");
        return "n/a";
      }
    };

    /* src\SkillPane.svelte generated by Svelte v3.48.0 */
    const file$3 = "src\\SkillPane.svelte";

    // (23:2) {#if skill}
    function create_if_block$3(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t0_value = /*skill*/ ctx[0].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*skill*/ ctx[0].ddStringPermanent + "";
    	let t2;
    	let div0_class_value;
    	let t3;
    	let div1;
    	let p;
    	let t4;
    	let strong0;
    	let t5_value = /*skill*/ ctx[0].DD + "";
    	let t5;
    	let t6;
    	let br0;
    	let t7;
    	let strong1;
    	let t8_value = /*skill*/ ctx[0].quarterFlips / 4 + "";
    	let t8;
    	let t9;
    	let br1;
    	let t10;
    	let strong2;
    	let t11_value = /*skill*/ ctx[0].twistsTotal / 2 + "";
    	let t11;
    	let t12;
    	let br2;
    	let t13;
    	let strong3;
    	let t14_value = /*shapeToString*/ ctx[2](/*skill*/ ctx[0].shape) + "";
    	let t14;
    	let t15;
    	let br3;
    	let t16;
    	let strong4;
    	let t17_value = (/*skill*/ ctx[0].backward ? "backward" : "forward") + "";
    	let t17;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			p = element("p");
    			t4 = text("DD: ");
    			strong0 = element("strong");
    			t5 = text(t5_value);
    			t6 = space();
    			br0 = element("br");
    			t7 = text("\r\n          Flips: ");
    			strong1 = element("strong");
    			t8 = text(t8_value);
    			t9 = space();
    			br1 = element("br");
    			t10 = text("\r\n          Twists: ");
    			strong2 = element("strong");
    			t11 = text(t11_value);
    			t12 = space();
    			br2 = element("br");
    			t13 = text("\r\n          Shape: ");
    			strong3 = element("strong");
    			t14 = text(t14_value);
    			t15 = space();
    			br3 = element("br");
    			t16 = text("\r\n          Direction: ");
    			strong4 = element("strong");
    			t17 = text(t17_value);
    			attr_dev(h2, "id", "SkillInfoTitle");
    			attr_dev(h2, "class", "svelte-14x0ent");
    			add_location(h2, file$3, 25, 8, 560);
    			attr_dev(div0, "id", "InfoBar");
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"));
    			add_location(div0, file$3, 24, 6, 513);
    			add_location(strong0, file$3, 32, 14, 769);
    			add_location(br0, file$3, 32, 42, 797);
    			add_location(strong1, file$3, 33, 17, 822);
    			add_location(br1, file$3, 33, 59, 864);
    			add_location(strong2, file$3, 34, 18, 890);
    			add_location(br2, file$3, 34, 59, 931);
    			add_location(strong3, file$3, 35, 17, 956);
    			add_location(br3, file$3, 35, 63, 1002);
    			add_location(strong4, file$3, 36, 21, 1031);
    			attr_dev(p, "id", "skillInfoText");
    			attr_dev(p, "class", "svelte-14x0ent");
    			add_location(p, file$3, 31, 8, 731);
    			attr_dev(div1, "id", "skillInfo");
    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"));
    			add_location(div1, file$3, 30, 6, 682);
    			attr_dev(div2, "id", "outputDiv");
    			attr_dev(div2, "class", "svelte-14x0ent");
    			add_location(div2, file$3, 23, 4, 485);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(h2, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t4);
    			append_dev(p, strong0);
    			append_dev(strong0, t5);
    			append_dev(p, t6);
    			append_dev(p, br0);
    			append_dev(p, t7);
    			append_dev(p, strong1);
    			append_dev(strong1, t8);
    			append_dev(p, t9);
    			append_dev(p, br1);
    			append_dev(p, t10);
    			append_dev(p, strong2);
    			append_dev(strong2, t11);
    			append_dev(p, t12);
    			append_dev(p, br2);
    			append_dev(p, t13);
    			append_dev(p, strong3);
    			append_dev(strong3, t14);
    			append_dev(p, t15);
    			append_dev(p, br3);
    			append_dev(p, t16);
    			append_dev(p, strong4);
    			append_dev(strong4, t17);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t0_value !== (t0_value = /*skill*/ ctx[0].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*skill*/ 1 && t2_value !== (t2_value = /*skill*/ ctx[0].ddStringPermanent + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*colorClass*/ 2 && div0_class_value !== (div0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*skill*/ 1 && t5_value !== (t5_value = /*skill*/ ctx[0].DD + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*skill*/ 1 && t8_value !== (t8_value = /*skill*/ ctx[0].quarterFlips / 4 + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*skill*/ 1 && t11_value !== (t11_value = /*skill*/ ctx[0].twistsTotal / 2 + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*skill*/ 1 && t14_value !== (t14_value = /*shapeToString*/ ctx[2](/*skill*/ ctx[0].shape) + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*skill*/ 1 && t17_value !== (t17_value = (/*skill*/ ctx[0].backward ? "backward" : "forward") + "")) set_data_dev(t17, t17_value);

    			if (dirty & /*colorClass*/ 2 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(23:2) {#if skill}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let if_block = /*skill*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
    			add_location(main, file$3, 21, 0, 458);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*skill*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let colorClass;
    	let $discipline;
    	validate_store(discipline, 'discipline');
    	component_subscribe($$self, discipline, $$value => $$invalidate(3, $discipline = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SkillPane', slots, []);
    	let { skill } = $$props;

    	var shapeToString = function (shape) {
    		if (shape == "o") {
    			return "tuck";
    		} else if (shape == "<") {
    			return "pike";
    		} else if (shape == "/") {
    			return "layout";
    		} else {
    			// throw("????");
    			return "n/a";
    		}
    	};

    	const writable_props = ['skill'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SkillPane> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    	};

    	$$self.$capture_state = () => ({
    		discipline,
    		disciplineToColor,
    		skill,
    		shapeToString,
    		colorClass,
    		$discipline
    	});

    	$$self.$inject_state = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    		if ('shapeToString' in $$props) $$invalidate(2, shapeToString = $$props.shapeToString);
    		if ('colorClass' in $$props) $$invalidate(1, colorClass = $$props.colorClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$discipline*/ 8) {
    			$$invalidate(1, colorClass = disciplineToColor($discipline));
    		}
    	};

    	return [skill, colorClass, shapeToString, $discipline];
    }

    class SkillPane extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { skill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SkillPane",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*skill*/ ctx[0] === undefined && !('skill' in props)) {
    			console.warn("<SkillPane> was created without expected prop 'skill'");
    		}
    	}

    	get skill() {
    		throw new Error("<SkillPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skill(value) {
    		throw new Error("<SkillPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\RoutinePane.svelte generated by Svelte v3.48.0 */
    const file$2 = "src\\RoutinePane.svelte";

    // (23:2) {#if skill}
    function create_if_block$2(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t0;
    	let t1_value = /*skill*/ ctx[0].map(func$1).reduce(func_1$1) + "";
    	let t1;
    	let div0_class_value;
    	let t2;
    	let div1;
    	let p;
    	let t3;
    	let strong0;
    	let t4_value = /*skill*/ ctx[0].map(func_2$1).reduce(func_3$1) + "";
    	let t4;
    	let t5;
    	let br0;
    	let t6;
    	let strong1;
    	let t7_value = /*skill*/ ctx[0].map(func_4$1).reduce(func_5$1) / /*skill*/ ctx[0].length + "";
    	let t7;
    	let t8;
    	let br1;
    	let t9;
    	let strong2;
    	let t10_value = /*skill*/ ctx[0].map(func_6$1).reduce(func_7$1) / 4 + "";
    	let t10;
    	let t11;
    	let br2;
    	let t12;
    	let strong3;
    	let t13_value = /*skill*/ ctx[0].map(func_8$1).reduce(func_9$1) / 4 / /*skill*/ ctx[0].length + "";
    	let t13;
    	let t14;
    	let br3;
    	let t15;
    	let strong4;
    	let t16_value = /*skill*/ ctx[0].map(func_10$1).reduce(func_11$1) / 2 + "";
    	let t16;
    	let t17;
    	let br4;
    	let t18;
    	let strong5;
    	let t19_value = /*skill*/ ctx[0].map(func_12$1).reduce(func_13) / 2 / /*skill*/ ctx[0].length + "";
    	let t19;
    	let t20;
    	let br5;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text("Routine: ");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			p = element("p");
    			t3 = text("DD: ");
    			strong0 = element("strong");
    			t4 = text(t4_value);
    			t5 = space();
    			br0 = element("br");
    			t6 = text("\r\n          Average DD:\r\n          ");
    			strong1 = element("strong");
    			t7 = text(t7_value);
    			t8 = space();
    			br1 = element("br");
    			t9 = text("\r\n          Total Flips:\r\n          ");
    			strong2 = element("strong");
    			t10 = text(t10_value);
    			t11 = space();
    			br2 = element("br");
    			t12 = text("\r\n          Average Flips:\r\n          ");
    			strong3 = element("strong");
    			t13 = text(t13_value);
    			t14 = space();
    			br3 = element("br");
    			t15 = text("\r\n          Total Twists:\r\n          ");
    			strong4 = element("strong");
    			t16 = text(t16_value);
    			t17 = space();
    			br4 = element("br");
    			t18 = text("\r\n          Average Twists:\r\n          ");
    			strong5 = element("strong");
    			t19 = text(t19_value);
    			t20 = space();
    			br5 = element("br");
    			attr_dev(h2, "id", "SkillInfoTitle");
    			attr_dev(h2, "class", "svelte-14x0ent");
    			add_location(h2, file$2, 25, 8, 560);
    			attr_dev(div0, "id", "InfoBar");
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"));
    			add_location(div0, file$2, 24, 6, 513);
    			add_location(strong0, file$2, 33, 14, 828);
    			add_location(br0, file$2, 34, 12, 908);
    			add_location(strong1, file$2, 36, 10, 949);
    			add_location(br1, file$2, 39, 12, 1073);
    			add_location(strong2, file$2, 41, 10, 1115);
    			add_location(br2, file$2, 44, 12, 1238);
    			add_location(strong3, file$2, 46, 10, 1282);
    			add_location(br3, file$2, 50, 12, 1435);
    			add_location(strong4, file$2, 52, 10, 1478);
    			add_location(br4, file$2, 55, 12, 1600);
    			add_location(strong5, file$2, 57, 10, 1645);
    			add_location(br5, file$2, 61, 12, 1797);
    			attr_dev(p, "id", "skillInfoText");
    			attr_dev(p, "class", "svelte-14x0ent");
    			add_location(p, file$2, 32, 8, 790);
    			attr_dev(div1, "id", "skillInfo");
    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"));
    			add_location(div1, file$2, 31, 6, 741);
    			attr_dev(div2, "id", "outputDiv");
    			attr_dev(div2, "class", "svelte-14x0ent");
    			add_location(div2, file$2, 23, 4, 485);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t3);
    			append_dev(p, strong0);
    			append_dev(strong0, t4);
    			append_dev(p, t5);
    			append_dev(p, br0);
    			append_dev(p, t6);
    			append_dev(p, strong1);
    			append_dev(strong1, t7);
    			append_dev(p, t8);
    			append_dev(p, br1);
    			append_dev(p, t9);
    			append_dev(p, strong2);
    			append_dev(strong2, t10);
    			append_dev(p, t11);
    			append_dev(p, br2);
    			append_dev(p, t12);
    			append_dev(p, strong3);
    			append_dev(strong3, t13);
    			append_dev(p, t14);
    			append_dev(p, br3);
    			append_dev(p, t15);
    			append_dev(p, strong4);
    			append_dev(strong4, t16);
    			append_dev(p, t17);
    			append_dev(p, br4);
    			append_dev(p, t18);
    			append_dev(p, strong5);
    			append_dev(strong5, t19);
    			append_dev(p, t20);
    			append_dev(p, br5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && t1_value !== (t1_value = /*skill*/ ctx[0].map(func$1).reduce(func_1$1) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*colorClass*/ 2 && div0_class_value !== (div0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*skill*/ 1 && t4_value !== (t4_value = /*skill*/ ctx[0].map(func_2$1).reduce(func_3$1) + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*skill*/ 1 && t7_value !== (t7_value = /*skill*/ ctx[0].map(func_4$1).reduce(func_5$1) / /*skill*/ ctx[0].length + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*skill*/ 1 && t10_value !== (t10_value = /*skill*/ ctx[0].map(func_6$1).reduce(func_7$1) / 4 + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*skill*/ 1 && t13_value !== (t13_value = /*skill*/ ctx[0].map(func_8$1).reduce(func_9$1) / 4 / /*skill*/ ctx[0].length + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*skill*/ 1 && t16_value !== (t16_value = /*skill*/ ctx[0].map(func_10$1).reduce(func_11$1) / 2 + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*skill*/ 1 && t19_value !== (t19_value = /*skill*/ ctx[0].map(func_12$1).reduce(func_13) / 2 / /*skill*/ ctx[0].length + "")) set_data_dev(t19, t19_value);

    			if (dirty & /*colorClass*/ 2 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[1]) + " svelte-14x0ent"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(23:2) {#if skill}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let if_block = /*skill*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
    			add_location(main, file$2, 21, 0, 458);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*skill*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func$1 = el => el.ddStringPermanent;
    const func_1$1 = (a, b) => a + " " + b;
    const func_2$1 = el => el.DD;
    const func_3$1 = (a, b) => a + b;
    const func_4$1 = el => el.DD;
    const func_5$1 = (a, b) => a + b;
    const func_6$1 = el => el.quarterFlips;
    const func_7$1 = (a, b) => a + b;
    const func_8$1 = el => el.quarterFlips;
    const func_9$1 = (a, b) => a + b;
    const func_10$1 = el => el.twistsTotal;
    const func_11$1 = (a, b) => a + b;
    const func_12$1 = el => el.twistsTotal;
    const func_13 = (a, b) => a + b;

    function instance$2($$self, $$props, $$invalidate) {
    	let colorClass;
    	let $discipline;
    	validate_store(discipline, 'discipline');
    	component_subscribe($$self, discipline, $$value => $$invalidate(2, $discipline = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RoutinePane', slots, []);
    	let { skill } = $$props;

    	var shapeToString = function (shape) {
    		if (shape == "o") {
    			return "tuck";
    		} else if (shape == "<") {
    			return "pike";
    		} else if (shape == "/") {
    			return "layout";
    		} else {
    			// throw("????");
    			return "n/a";
    		}
    	};

    	const writable_props = ['skill'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<RoutinePane> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    	};

    	$$self.$capture_state = () => ({
    		discipline,
    		disciplineToColor,
    		skill,
    		shapeToString,
    		colorClass,
    		$discipline
    	});

    	$$self.$inject_state = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    		if ('shapeToString' in $$props) shapeToString = $$props.shapeToString;
    		if ('colorClass' in $$props) $$invalidate(1, colorClass = $$props.colorClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$discipline*/ 4) {
    			$$invalidate(1, colorClass = disciplineToColor($discipline));
    		}
    	};

    	return [skill, colorClass, $discipline];
    }

    class RoutinePane extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { skill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RoutinePane",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*skill*/ ctx[0] === undefined && !('skill' in props)) {
    			console.warn("<RoutinePane> was created without expected prop 'skill'");
    		}
    	}

    	get skill() {
    		throw new Error("<RoutinePane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skill(value) {
    		throw new Error("<RoutinePane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\RoutineSetPane.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$1 = "src\\RoutineSetPane.svelte";

    // (30:2) {#if skill}
    function create_if_block$1(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let div0_class_value;
    	let t1;
    	let div1;
    	let p;

    	let t2_value = (new Set(/*totalSkillList*/ ctx[1]).size !== /*totalSkillList*/ ctx[1].length
    	? "This is not a valid routine set because it contains a duplicate " + /*totalSkillList*/ ctx[1].filter(func)[0]
    	: "This is a valid routine set") + "";

    	let t2;
    	let t3;
    	let br0;
    	let t4;
    	let strong0;
    	let t5_value = /*skill*/ ctx[0].flat().map(func_1).reduce(func_2) + "";
    	let t5;
    	let br1;
    	let t6;
    	let strong1;
    	let t7_value = /*skill*/ ctx[0].flat().map(func_3).reduce(func_4) / /*skill*/ ctx[0].length + "";
    	let t7;
    	let br2;
    	let t8;
    	let strong2;
    	let t9_value = /*skill*/ ctx[0].flat().map(func_5).reduce(func_6) / 4 + "";
    	let t9;
    	let br3;
    	let t10;
    	let strong3;
    	let t11_value = /*skill*/ ctx[0].flat().map(func_7).reduce(func_8) / (4 * /*skill*/ ctx[0].length) + "";
    	let t11;
    	let br4;
    	let t12;
    	let strong4;
    	let t13_value = /*skill*/ ctx[0].flat().map(func_9).reduce(func_10) / 2 + "";
    	let t13;
    	let br5;
    	let t14;
    	let strong5;
    	let t15_value = /*skill*/ ctx[0].flat().map(func_11).reduce(func_12) / (2 * /*skill*/ ctx[0].length) + "";
    	let t15;
    	let br6;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Routine Set Info";
    			t1 = space();
    			div1 = element("div");
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			br0 = element("br");
    			t4 = text("\r\n          Total DD:\r\n          ");
    			strong0 = element("strong");
    			t5 = text(t5_value);
    			br1 = element("br");
    			t6 = text("\r\n          Average DD per routine:\r\n          ");
    			strong1 = element("strong");
    			t7 = text(t7_value);
    			br2 = element("br");
    			t8 = text("\r\n          Total Flips:\r\n          ");
    			strong2 = element("strong");
    			t9 = text(t9_value);
    			br3 = element("br");
    			t10 = text("\r\n          Average flips per routine:\r\n          ");
    			strong3 = element("strong");
    			t11 = text(t11_value);
    			br4 = element("br");
    			t12 = text("\r\n          Total Twists:\r\n          ");
    			strong4 = element("strong");
    			t13 = text(t13_value);
    			br5 = element("br");
    			t14 = text("\r\n          Average twists per routine:\r\n          ");
    			strong5 = element("strong");
    			t15 = text(t15_value);
    			br6 = element("br");
    			attr_dev(h2, "id", "SkillInfoTitle");
    			attr_dev(h2, "class", "svelte-v5e15n");
    			add_location(h2, file$1, 32, 8, 782);
    			attr_dev(div0, "id", "InfoBar");
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-v5e15n"));
    			add_location(div0, file$1, 31, 6, 735);
    			add_location(br0, file$1, 40, 45, 1264);
    			add_location(strong0, file$1, 42, 10, 1303);
    			add_location(br1, file$1, 47, 11, 1451);
    			add_location(strong1, file$1, 49, 10, 1504);
    			add_location(br2, file$1, 54, 11, 1667);
    			add_location(strong2, file$1, 56, 10, 1709);
    			add_location(br3, file$1, 61, 11, 1871);
    			add_location(strong3, file$1, 63, 10, 1927);
    			add_location(br4, file$1, 69, 11, 2121);
    			add_location(strong4, file$1, 71, 10, 2164);
    			add_location(br5, file$1, 76, 11, 2325);
    			add_location(strong5, file$1, 78, 10, 2382);
    			add_location(br6, file$1, 84, 11, 2575);
    			attr_dev(p, "id", "skillInfoText");
    			attr_dev(p, "class", "svelte-v5e15n");
    			add_location(p, file$1, 35, 8, 898);
    			attr_dev(div1, "id", "skillInfo");
    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-v5e15n"));
    			add_location(div1, file$1, 34, 6, 849);
    			attr_dev(div2, "id", "outputDiv");
    			attr_dev(div2, "class", "svelte-v5e15n");
    			add_location(div2, file$1, 30, 4, 707);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, br0);
    			append_dev(p, t4);
    			append_dev(p, strong0);
    			append_dev(strong0, t5);
    			append_dev(p, br1);
    			append_dev(p, t6);
    			append_dev(p, strong1);
    			append_dev(strong1, t7);
    			append_dev(p, br2);
    			append_dev(p, t8);
    			append_dev(p, strong2);
    			append_dev(strong2, t9);
    			append_dev(p, br3);
    			append_dev(p, t10);
    			append_dev(p, strong3);
    			append_dev(strong3, t11);
    			append_dev(p, br4);
    			append_dev(p, t12);
    			append_dev(p, strong4);
    			append_dev(strong4, t13);
    			append_dev(p, br5);
    			append_dev(p, t14);
    			append_dev(p, strong5);
    			append_dev(strong5, t15);
    			append_dev(p, br6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*colorClass*/ 4 && div0_class_value !== (div0_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-v5e15n"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*totalSkillList*/ 2 && t2_value !== (t2_value = (new Set(/*totalSkillList*/ ctx[1]).size !== /*totalSkillList*/ ctx[1].length
    			? "This is not a valid routine set because it contains a duplicate " + /*totalSkillList*/ ctx[1].filter(func)[0]
    			: "This is a valid routine set") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*skill*/ 1 && t5_value !== (t5_value = /*skill*/ ctx[0].flat().map(func_1).reduce(func_2) + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*skill*/ 1 && t7_value !== (t7_value = /*skill*/ ctx[0].flat().map(func_3).reduce(func_4) / /*skill*/ ctx[0].length + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*skill*/ 1 && t9_value !== (t9_value = /*skill*/ ctx[0].flat().map(func_5).reduce(func_6) / 4 + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*skill*/ 1 && t11_value !== (t11_value = /*skill*/ ctx[0].flat().map(func_7).reduce(func_8) / (4 * /*skill*/ ctx[0].length) + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*skill*/ 1 && t13_value !== (t13_value = /*skill*/ ctx[0].flat().map(func_9).reduce(func_10) / 2 + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*skill*/ 1 && t15_value !== (t15_value = /*skill*/ ctx[0].flat().map(func_11).reduce(func_12) / (2 * /*skill*/ ctx[0].length) + "")) set_data_dev(t15, t15_value);

    			if (dirty & /*colorClass*/ 4 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-v5e15n"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(30:2) {#if skill}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let if_block = /*skill*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
    			add_location(main, file$1, 28, 0, 680);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*skill*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toFindDuplicates(arry) {
    	const uniqueElements = new Set(arry);

    	arry.filter(item => {
    		if (uniqueElements.has(item)) {
    			uniqueElements.delete(item);
    		} else {
    			return item;
    		}
    	});

    	return [...new Set(uniqueElements)];
    }

    const func = (e, i, a) => a.indexOf(e) !== i;
    const func_1 = el => el.DD;
    const func_2 = (a, b) => a + b;
    const func_3 = el => el.DD;
    const func_4 = (a, b) => a + b;
    const func_5 = el => el.quarterFlips;
    const func_6 = (a, b) => a + b;
    const func_7 = el => el.quarterFlips;
    const func_8 = (a, b) => a + b;
    const func_9 = el => el.twistsTotal;
    const func_10 = (a, b) => a + b;
    const func_11 = el => el.twistsTotal;
    const func_12 = (a, b) => a + b;

    function instance$1($$self, $$props, $$invalidate) {
    	let colorClass;
    	let totalSkillList;
    	let $discipline;
    	validate_store(discipline, 'discipline');
    	component_subscribe($$self, discipline, $$value => $$invalidate(3, $discipline = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RoutineSetPane', slots, []);
    	let { skill } = $$props;
    	console.log(totalSkillList);
    	const writable_props = ['skill'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<RoutineSetPane> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    	};

    	$$self.$capture_state = () => ({
    		discipline,
    		disciplineToColor,
    		skill,
    		toFindDuplicates,
    		totalSkillList,
    		colorClass,
    		$discipline
    	});

    	$$self.$inject_state = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    		if ('totalSkillList' in $$props) $$invalidate(1, totalSkillList = $$props.totalSkillList);
    		if ('colorClass' in $$props) $$invalidate(2, colorClass = $$props.colorClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$discipline*/ 8) {
    			$$invalidate(2, colorClass = disciplineToColor($discipline));
    		}

    		if ($$self.$$.dirty & /*skill*/ 1) {
    			$$invalidate(1, totalSkillList = skill.flat().map(el => el.ddStringPermanent).filter(el => !("hf^(").includes(el)));
    		}
    	};

    	return [skill, totalSkillList, colorClass, $discipline];
    }

    class RoutineSetPane extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { skill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RoutineSetPane",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*skill*/ ctx[0] === undefined && !('skill' in props)) {
    			console_1$1.warn("<RoutineSetPane> was created without expected prop 'skill'");
    		}
    	}

    	get skill() {
    		throw new Error("<RoutineSetPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skill(value) {
    		throw new Error("<RoutineSetPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (54:2) {:else}
    function create_else_block(ctx) {
    	let routinepane;
    	let t0;
    	let div0;
    	let t1;
    	let div1;
    	let h2;
    	let t2;
    	let h2_class_value;
    	let t3;
    	let current;

    	routinepane = new RoutinePane({
    			props: { skill: /*skill*/ ctx[3] },
    			$$inline: true
    		});

    	let each_value_1 = /*skill*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			create_component(routinepane.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			t1 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			t2 = text("Individual Skill Information");
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "id", "spacer");
    			attr_dev(div0, "class", "svelte-upcgw1");
    			add_location(div0, file, 55, 4, 1682);
    			attr_dev(h2, "class", h2_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-upcgw1"));
    			add_location(h2, file, 57, 6, 1737);
    			attr_dev(div1, "id", "routineSkills");
    			attr_dev(div1, "class", "svelte-upcgw1");
    			add_location(div1, file, 56, 4, 1706);
    		},
    		m: function mount(target, anchor) {
    			mount_component(routinepane, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(h2, t2);
    			append_dev(div1, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const routinepane_changes = {};
    			if (dirty & /*skill*/ 8) routinepane_changes.skill = /*skill*/ ctx[3];
    			routinepane.$set(routinepane_changes);

    			if (!current || dirty & /*colorClass*/ 4 && h2_class_value !== (h2_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-upcgw1"))) {
    				attr_dev(h2, "class", h2_class_value);
    			}

    			if (dirty & /*skill*/ 8) {
    				each_value_1 = /*skill*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(routinepane.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(routinepane.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(routinepane, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(54:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (45:27) 
    function create_if_block_1(ctx) {
    	let routinesetpane;
    	let t0;
    	let div0;
    	let t1;
    	let div1;
    	let h2;
    	let t2;
    	let h2_class_value;
    	let t3;
    	let current;

    	routinesetpane = new RoutineSetPane({
    			props: { skill: /*skill*/ ctx[3] },
    			$$inline: true
    		});

    	let each_value = /*skill*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			create_component(routinesetpane.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			t1 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			t2 = text("Individual Routines");
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "id", "spacer");
    			attr_dev(div0, "class", "svelte-upcgw1");
    			add_location(div0, file, 46, 4, 1451);
    			attr_dev(h2, "class", h2_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-upcgw1"));
    			add_location(h2, file, 48, 6, 1506);
    			attr_dev(div1, "id", "routineSkills");
    			attr_dev(div1, "class", "svelte-upcgw1");
    			add_location(div1, file, 47, 4, 1475);
    		},
    		m: function mount(target, anchor) {
    			mount_component(routinesetpane, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(h2, t2);
    			append_dev(div1, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const routinesetpane_changes = {};
    			if (dirty & /*skill*/ 8) routinesetpane_changes.skill = /*skill*/ ctx[3];
    			routinesetpane.$set(routinesetpane_changes);

    			if (!current || dirty & /*colorClass*/ 4 && h2_class_value !== (h2_class_value = "" + (null_to_empty(/*colorClass*/ ctx[2]) + " svelte-upcgw1"))) {
    				attr_dev(h2, "class", h2_class_value);
    			}

    			if (dirty & /*skill*/ 8) {
    				each_value = /*skill*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(routinesetpane.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(routinesetpane.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(routinesetpane, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(45:27) ",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#if !routineFlag && !routineSetFlag}
    function create_if_block(ctx) {
    	let skillpane;
    	let current;

    	skillpane = new SkillPane({
    			props: { skill: /*skill*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skillpane.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skillpane, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const skillpane_changes = {};
    			if (dirty & /*skill*/ 8) skillpane_changes.skill = /*skill*/ ctx[3];
    			skillpane.$set(skillpane_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skillpane.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skillpane.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skillpane, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(43:2) {#if !routineFlag && !routineSetFlag}",
    		ctx
    	});

    	return block;
    }

    // (59:6) {#each skill as skill}
    function create_each_block_1(ctx) {
    	let skillpane;
    	let current;

    	skillpane = new SkillPane({
    			props: { skill: /*skill*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skillpane.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skillpane, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const skillpane_changes = {};
    			if (dirty & /*skill*/ 8) skillpane_changes.skill = /*skill*/ ctx[3];
    			skillpane.$set(skillpane_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skillpane.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skillpane.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skillpane, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(59:6) {#each skill as skill}",
    		ctx
    	});

    	return block;
    }

    // (50:6) {#each skill as skill}
    function create_each_block(ctx) {
    	let routinepane;
    	let current;

    	routinepane = new RoutinePane({
    			props: { skill: /*skill*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(routinepane.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(routinepane, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const routinepane_changes = {};
    			if (dirty & /*skill*/ 8) routinepane_changes.skill = /*skill*/ ctx[3];
    			routinepane.$set(routinepane_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(routinepane.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(routinepane.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(routinepane, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(50:6) {#each skill as skill}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let inputbar;
    	let t2;
    	let p;
    	let t4;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	inputbar = new InputBar({ $$inline: true });
    	inputbar.$on("new_skill", /*newSkillHandler*/ ctx[4]);
    	const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*routineFlag*/ ctx[0] && !/*routineSetFlag*/ ctx[1]) return 0;
    		if (/*routineSetFlag*/ ctx[1]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "T&T Skill Info";
    			t1 = space();
    			create_component(inputbar.$$.fragment);
    			t2 = space();
    			p = element("p");
    			p.textContent = "Enter a skill or routine using FIG notation";
    			t4 = space();
    			if_block.c();
    			attr_dev(h1, "class", "svelte-upcgw1");
    			add_location(h1, file, 38, 2, 1198);
    			attr_dev(p, "class", "svelte-upcgw1");
    			add_location(p, file, 41, 2, 1271);
    			attr_dev(main, "class", "svelte-upcgw1");
    			add_location(main, file, 37, 0, 1189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(inputbar, main, null);
    			append_dev(main, t2);
    			append_dev(main, p);
    			append_dev(main, t4);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inputbar.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inputbar.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(inputbar);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let colorClass;
    	let $discipline;
    	validate_store(discipline, 'discipline');
    	component_subscribe($$self, discipline, $$value => $$invalidate(5, $discipline = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let skill = null;
    	let routineFlag = false;
    	let routineSetFlag = false;

    	const newSkillHandler = event => {
    		const { curFIG, discipline } = event.detail; //event.detail stores the data in the event

    		if (curFIG.includes("{")) {
    			$$invalidate(3, skill = curFIG.slice(1, curFIG.length - 1).split("} {").map(el => el.split(" ").map(el2 => new Skill(el2, discipline))));
    			console.log(skill);
    			$$invalidate(0, routineFlag = false);
    			$$invalidate(1, routineSetFlag = true);
    		} else if (curFIG.split(" ").length == 1) {
    			$$invalidate(3, skill = new Skill(curFIG, discipline));
    			$$invalidate(0, routineFlag = false);
    			$$invalidate(1, routineSetFlag = false);
    		} else {
    			$$invalidate(3, skill = curFIG.split(" ").map(el => new Skill(el, discipline)));
    			$$invalidate(0, routineFlag = true);
    			$$invalidate(1, routineSetFlag = false);
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		InputBar,
    		SkillPane,
    		RoutinePane,
    		RoutineSetPane,
    		Skill,
    		discipline,
    		disciplineToColor,
    		skill,
    		routineFlag,
    		routineSetFlag,
    		newSkillHandler,
    		colorClass,
    		$discipline
    	});

    	$$self.$inject_state = $$props => {
    		if ('skill' in $$props) $$invalidate(3, skill = $$props.skill);
    		if ('routineFlag' in $$props) $$invalidate(0, routineFlag = $$props.routineFlag);
    		if ('routineSetFlag' in $$props) $$invalidate(1, routineSetFlag = $$props.routineSetFlag);
    		if ('colorClass' in $$props) $$invalidate(2, colorClass = $$props.colorClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$discipline*/ 32) {
    			$$invalidate(2, colorClass = disciplineToColor($discipline));
    		}
    	};

    	return [routineFlag, routineSetFlag, colorClass, skill, newSkillHandler, $discipline];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
