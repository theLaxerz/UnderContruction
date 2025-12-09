/**
 * DOM Controller - Comprehensive DOM Manipulation API
 * Provides full control over the Document Object Model
 */

const DOMController = {
  /**
   * Element Selection Methods
   */
  select: {
    // Get single element by CSS selector
    one(selector) {
      return document.querySelector(selector);
    },

    // Get all elements matching CSS selector
    all(selector) {
      return Array.from(document.querySelectorAll(selector));
    },

    // Get element by ID
    byId(id) {
      return document.getElementById(id);
    },

    // Get elements by class name
    byClass(className) {
      return Array.from(document.getElementsByClassName(className));
    },

    // Get elements by tag name
    byTag(tagName) {
      return Array.from(document.getElementsByTagName(tagName));
    },

    // Get elements by name attribute
    byName(name) {
      return Array.from(document.getElementsByName(name));
    },

    // XPath selection
    byXPath(xpath) {
      const result = [];
      const query = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (let i = 0; i < query.snapshotLength; i++) {
        result.push(query.snapshotItem(i));
      }
      return result;
    },

    // Get element at specific coordinates
    atPoint(x, y) {
      return document.elementFromPoint(x, y);
    },

    // Get all elements at specific coordinates (stacked)
    allAtPoint(x, y) {
      return document.elementsFromPoint(x, y);
    }
  },

  /**
   * Element Creation Methods
   */
  create: {
    // Create new element
    element(tagName, attributes = {}, content = '') {
      const el = document.createElement(tagName);

      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
          Object.assign(el.style, value);
        } else if (key === 'dataset' && typeof value === 'object') {
          Object.entries(value).forEach(([dataKey, dataValue]) => {
            el.dataset[dataKey] = dataValue;
          });
        } else if (key === 'events' && typeof value === 'object') {
          Object.entries(value).forEach(([event, handler]) => {
            el.addEventListener(event, new Function('event', handler));
          });
        } else if (key.startsWith('on')) {
          el[key] = new Function('event', value);
        } else {
          el.setAttribute(key, value);
        }
      });

      if (content) {
        el.innerHTML = content;
      }

      return el;
    },

    // Create text node
    text(content) {
      return document.createTextNode(content);
    },

    // Create comment node
    comment(content) {
      return document.createComment(content);
    },

    // Create document fragment
    fragment(html = '') {
      const fragment = document.createDocumentFragment();
      if (html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
      }
      return fragment;
    },

    // Create element from HTML string
    fromHTML(html) {
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();
      return temp.firstChild;
    }
  },

  /**
   * DOM Manipulation Methods
   */
  manipulate: {
    // Append child to parent
    append(parent, child) {
      if (typeof parent === 'string') parent = document.querySelector(parent);
      if (typeof child === 'string') child = DOMController.create.fromHTML(child);
      return parent?.appendChild(child);
    },

    // Prepend child to parent
    prepend(parent, child) {
      if (typeof parent === 'string') parent = document.querySelector(parent);
      if (typeof child === 'string') child = DOMController.create.fromHTML(child);
      return parent?.insertBefore(child, parent.firstChild);
    },

    // Insert before reference element
    insertBefore(newNode, referenceNode) {
      if (typeof newNode === 'string') newNode = DOMController.create.fromHTML(newNode);
      if (typeof referenceNode === 'string') referenceNode = document.querySelector(referenceNode);
      return referenceNode?.parentNode?.insertBefore(newNode, referenceNode);
    },

    // Insert after reference element
    insertAfter(newNode, referenceNode) {
      if (typeof newNode === 'string') newNode = DOMController.create.fromHTML(newNode);
      if (typeof referenceNode === 'string') referenceNode = document.querySelector(referenceNode);
      return referenceNode?.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
    },

    // Remove element
    remove(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.remove();
    },

    // Remove all matching elements
    removeAll(selector) {
      document.querySelectorAll(selector).forEach(el => el.remove());
    },

    // Replace element
    replace(oldNode, newNode) {
      if (typeof oldNode === 'string') oldNode = document.querySelector(oldNode);
      if (typeof newNode === 'string') newNode = DOMController.create.fromHTML(newNode);
      return oldNode?.parentNode?.replaceChild(newNode, oldNode);
    },

    // Clone element
    clone(element, deep = true) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.cloneNode(deep);
    },

    // Wrap element with another element
    wrap(element, wrapper) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (typeof wrapper === 'string') wrapper = DOMController.create.fromHTML(wrapper);
      element?.parentNode?.insertBefore(wrapper, element);
      wrapper?.appendChild(element);
      return wrapper;
    },

    // Unwrap element (remove parent, keep children)
    unwrap(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      const parent = element?.parentNode;
      if (parent) {
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
      }
    },

    // Empty element (remove all children)
    empty(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      while (element?.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  },

  /**
   * Content Methods
   */
  content: {
    // Get/set innerHTML
    html(element, content = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (content === undefined) return element?.innerHTML;
      if (element) element.innerHTML = content;
      return element;
    },

    // Get/set textContent
    text(element, content = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (content === undefined) return element?.textContent;
      if (element) element.textContent = content;
      return element;
    },

    // Get/set outerHTML
    outer(element, content = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (content === undefined) return element?.outerHTML;
      if (element) element.outerHTML = content;
      return element;
    },

    // Get/set value (for form elements)
    value(element, content = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (content === undefined) return element?.value;
      if (element) element.value = content;
      return element;
    }
  },

  /**
   * Attribute Methods
   */
  attributes: {
    // Get attribute
    get(element, name) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.getAttribute(name);
    },

    // Set attribute
    set(element, name, value) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.setAttribute(name, value);
      return element;
    },

    // Remove attribute
    remove(element, name) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.removeAttribute(name);
      return element;
    },

    // Check if attribute exists
    has(element, name) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.hasAttribute(name);
    },

    // Get all attributes
    getAll(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      const attrs = {};
      if (element?.attributes) {
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
      }
      return attrs;
    },

    // Set multiple attributes
    setMultiple(element, attributes) {
      if (typeof element === 'string') element = document.querySelector(element);
      Object.entries(attributes).forEach(([name, value]) => {
        element?.setAttribute(name, value);
      });
      return element;
    },

    // Toggle attribute
    toggle(element, name, force = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.toggleAttribute(name, force);
    }
  },

  /**
   * Class Methods
   */
  classes: {
    // Add class(es)
    add(element, ...classNames) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.classList.add(...classNames);
      return element;
    },

    // Remove class(es)
    remove(element, ...classNames) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.classList.remove(...classNames);
      return element;
    },

    // Toggle class
    toggle(element, className, force = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.classList.toggle(className, force);
    },

    // Check if has class
    has(element, className) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.classList.contains(className);
    },

    // Replace class
    replace(element, oldClass, newClass) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.classList.replace(oldClass, newClass);
    },

    // Get all classes
    getAll(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element ? Array.from(element.classList) : [];
    }
  },

  /**
   * Style Methods
   */
  style: {
    // Get computed style
    get(element, property = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      const computed = window.getComputedStyle(element);
      return property ? computed.getPropertyValue(property) : computed;
    },

    // Set style(s)
    set(element, property, value = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (typeof property === 'object') {
        Object.assign(element.style, property);
      } else {
        element.style[property] = value;
      }
      return element;
    },

    // Remove style property
    remove(element, property) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.style.removeProperty(property);
      return element;
    },

    // Show element
    show(element, display = '') {
      if (typeof element === 'string') element = document.querySelector(element);
      if (element) element.style.display = display;
      return element;
    },

    // Hide element
    hide(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (element) element.style.display = 'none';
      return element;
    },

    // Toggle visibility
    toggle(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (element) {
        element.style.display = element.style.display === 'none' ? '' : 'none';
      }
      return element;
    },

    // Inject CSS
    injectCSS(css, id = null) {
      const style = document.createElement('style');
      if (id) style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
      return style;
    },

    // Remove injected CSS
    removeCSS(id) {
      document.getElementById(id)?.remove();
    }
  },

  /**
   * Event Methods
   */
  events: {
    // Add event listener
    on(element, event, handler, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (typeof handler === 'string') handler = new Function('event', handler);
      element?.addEventListener(event, handler, options);
      return { element, event, handler, options };
    },

    // Remove event listener
    off(element, event, handler, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.removeEventListener(event, handler, options);
    },

    // Add one-time event listener
    once(element, event, handler, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (typeof handler === 'string') handler = new Function('event', handler);
      element?.addEventListener(event, handler, { ...options, once: true });
    },

    // Trigger event
    trigger(element, eventName, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      const event = new Event(eventName, { bubbles: true, cancelable: true, ...options });
      element?.dispatchEvent(event);
      return event;
    },

    // Trigger custom event with data
    triggerCustom(element, eventName, detail = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      const event = new CustomEvent(eventName, { bubbles: true, cancelable: true, detail });
      element?.dispatchEvent(event);
      return event;
    },

    // Simulate click
    click(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.click();
    },

    // Simulate focus
    focus(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.focus();
    },

    // Simulate blur
    blur(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.blur();
    },

    // Simulate mouse events
    mouse(element, type, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        ...options
      });
      element?.dispatchEvent(event);
    },

    // Simulate keyboard events
    keyboard(element, type, key, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      const event = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key,
        ...options
      });
      element?.dispatchEvent(event);
    }
  },

  /**
   * Traversal Methods
   */
  traverse: {
    // Get parent element
    parent(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.parentElement;
    },

    // Get all parent elements
    parents(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      const parents = [];
      let current = element?.parentElement;
      while (current) {
        if (!selector || current.matches(selector)) {
          parents.push(current);
        }
        current = current.parentElement;
      }
      return parents;
    },

    // Get closest ancestor matching selector
    closest(element, selector) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.closest(selector);
    },

    // Get children
    children(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      const children = element ? Array.from(element.children) : [];
      return selector ? children.filter(child => child.matches(selector)) : children;
    },

    // Get first child
    firstChild(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.firstElementChild;
    },

    // Get last child
    lastChild(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.lastElementChild;
    },

    // Get siblings
    siblings(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      const siblings = element?.parentElement
        ? Array.from(element.parentElement.children).filter(child => child !== element)
        : [];
      return selector ? siblings.filter(sibling => sibling.matches(selector)) : siblings;
    },

    // Get next sibling
    next(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      let sibling = element?.nextElementSibling;
      if (selector) {
        while (sibling && !sibling.matches(selector)) {
          sibling = sibling.nextElementSibling;
        }
      }
      return sibling;
    },

    // Get previous sibling
    prev(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      let sibling = element?.previousElementSibling;
      if (selector) {
        while (sibling && !sibling.matches(selector)) {
          sibling = sibling.previousElementSibling;
        }
      }
      return sibling;
    },

    // Get all next siblings
    nextAll(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      const siblings = [];
      let sibling = element?.nextElementSibling;
      while (sibling) {
        if (!selector || sibling.matches(selector)) {
          siblings.push(sibling);
        }
        sibling = sibling.nextElementSibling;
      }
      return siblings;
    },

    // Get all previous siblings
    prevAll(element, selector = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      const siblings = [];
      let sibling = element?.previousElementSibling;
      while (sibling) {
        if (!selector || sibling.matches(selector)) {
          siblings.push(sibling);
        }
        sibling = sibling.previousElementSibling;
      }
      return siblings;
    }
  },

  /**
   * Dimension and Position Methods
   */
  dimensions: {
    // Get bounding rectangle
    rect(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.getBoundingClientRect();
    },

    // Get offset (position relative to document)
    offset(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      const rect = element?.getBoundingClientRect();
      return rect ? {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      } : null;
    },

    // Get/set scroll position
    scroll(element = window, x = undefined, y = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (x === undefined && y === undefined) {
        if (element === window) {
          return { x: window.scrollX, y: window.scrollY };
        }
        return { x: element?.scrollLeft, y: element?.scrollTop };
      }
      if (element === window) {
        window.scrollTo(x ?? window.scrollX, y ?? window.scrollY);
      } else if (element) {
        if (x !== undefined) element.scrollLeft = x;
        if (y !== undefined) element.scrollTop = y;
      }
    },

    // Scroll element into view
    scrollIntoView(element, options = { behavior: 'smooth', block: 'center' }) {
      if (typeof element === 'string') element = document.querySelector(element);
      element?.scrollIntoView(options);
    },

    // Get width
    width(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.offsetWidth;
    },

    // Get height
    height(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.offsetHeight;
    },

    // Get inner width (without border)
    innerWidth(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.clientWidth;
    },

    // Get inner height (without border)
    innerHeight(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.clientHeight;
    },

    // Get scroll width
    scrollWidth(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.scrollWidth;
    },

    // Get scroll height
    scrollHeight(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      return element?.scrollHeight;
    }
  },

  /**
   * Form Methods
   */
  form: {
    // Get form data as object
    getData(form) {
      if (typeof form === 'string') form = document.querySelector(form);
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        if (data[key]) {
          if (Array.isArray(data[key])) {
            data[key].push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      });
      return data;
    },

    // Set form data from object
    setData(form, data) {
      if (typeof form === 'string') form = document.querySelector(form);
      Object.entries(data).forEach(([name, value]) => {
        const element = form?.elements[name];
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = Boolean(value);
          } else if (element.type === 'radio') {
            const radios = form.querySelectorAll(`[name="${name}"]`);
            radios.forEach(radio => {
              radio.checked = radio.value === value;
            });
          } else {
            element.value = value;
          }
        }
      });
    },

    // Submit form
    submit(form) {
      if (typeof form === 'string') form = document.querySelector(form);
      form?.submit();
    },

    // Reset form
    reset(form) {
      if (typeof form === 'string') form = document.querySelector(form);
      form?.reset();
    },

    // Validate form
    validate(form) {
      if (typeof form === 'string') form = document.querySelector(form);
      return form?.checkValidity();
    },

    // Report validity
    reportValidity(form) {
      if (typeof form === 'string') form = document.querySelector(form);
      return form?.reportValidity();
    }
  },

  /**
   * Data Storage Methods (element-based)
   */
  data: {
    // Get data attribute
    get(element, key = null) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (key === null) {
        return element?.dataset ? { ...element.dataset } : {};
      }
      return element?.dataset?.[key];
    },

    // Set data attribute
    set(element, key, value = undefined) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (typeof key === 'object') {
        Object.entries(key).forEach(([k, v]) => {
          if (element?.dataset) element.dataset[k] = v;
        });
      } else if (element?.dataset) {
        element.dataset[key] = value;
      }
      return element;
    },

    // Remove data attribute
    remove(element, key) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (element?.dataset) delete element.dataset[key];
      return element;
    }
  },

  /**
   * Utility Methods
   */
  utils: {
    // Wait for element to appear
    waitFor(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    },

    // Execute script
    executeScript(code) {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
      script.remove();
    },

    // Get page information
    getPageInfo() {
      return {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer,
        readyState: document.readyState,
        characterSet: document.characterSet,
        contentType: document.contentType,
        doctype: document.doctype?.name,
        lastModified: document.lastModified
      };
    },

    // Get all links on page
    getLinks() {
      return Array.from(document.links).map(link => ({
        href: link.href,
        text: link.textContent?.trim(),
        target: link.target
      }));
    },

    // Get all images on page
    getImages() {
      return Array.from(document.images).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height
      }));
    },

    // Get all forms on page
    getForms() {
      return Array.from(document.forms).map(form => ({
        id: form.id,
        name: form.name,
        action: form.action,
        method: form.method,
        elements: Array.from(form.elements).map(el => ({
          name: el.name,
          type: el.type,
          value: el.value
        }))
      }));
    },

    // Serialize element to object
    serialize(element) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (!element) return null;

      return {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        attributes: DOMController.attributes.getAll(element),
        textContent: element.textContent?.substring(0, 1000),
        innerHTML: element.innerHTML?.substring(0, 1000),
        childCount: element.children.length,
        rect: element.getBoundingClientRect()
      };
    },

    // Highlight element (for debugging)
    highlight(element, color = 'red', duration = 2000) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (!element) return;

      const originalOutline = element.style.outline;
      element.style.outline = `3px solid ${color}`;

      if (duration > 0) {
        setTimeout(() => {
          element.style.outline = originalOutline;
        }, duration);
      }
    },

    // Remove all highlights
    clearHighlights() {
      document.querySelectorAll('[style*="outline"]').forEach(el => {
        el.style.outline = '';
      });
    }
  },

  /**
   * Mutation Observer wrapper
   */
  observe: {
    // Watch for DOM changes
    changes(element, callback, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (!element) return null;

      const observer = new MutationObserver(callback);
      observer.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
        ...options
      });

      return observer;
    },

    // Watch for element resize
    resize(element, callback) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (!element) return null;

      const observer = new ResizeObserver(callback);
      observer.observe(element);

      return observer;
    },

    // Watch for element visibility
    visibility(element, callback, options = {}) {
      if (typeof element === 'string') element = document.querySelector(element);
      if (!element) return null;

      const observer = new IntersectionObserver(callback, options);
      observer.observe(element);

      return observer;
    }
  }
};

// Make available globally for content script
window.DOMController = DOMController;
