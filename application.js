(function() {
  // Constants
  // Minify will turn these in to short variables
  var FETCH_APS = 1;
  var FETCHING_APS = 2;
  var FETCHED_APS = 3;

  var CHANGE_SCAN_AP = 4;
  var CHANGE_MANUAL_AP = 5;
  var CHANGE_SECURITY = 6;
  var CHANGE_PASSKEY = 7;
  var CHANGE_DEVICE_NAME = 8;

  var NOT_SCANNED = 9;
  var SCANNING = 10;
  var SCANNING_COMPLETE = 11;
  var SAVING = 12;
  var CONNECTED = 13;
  var CONNECTION_ERROR = 14;

  var WIFI_SCAN = 15;
  var WIFI_MANUAL = 16;

  // The "store"
  var state = {}

  function assign() {
    return Object.assign.apply(this, arguments);
  }

  function ajax(url, method, data, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if(xhr.status == 200) {
          success(xhr.responseText);
        } else if(xhr.status == 422) {
          error(xhr.responseText);
        }
      }
    }

    if(data) {
      xhr.send(data);
    } else {
      xhr.send();
    }
  }

  var reducers = {};
  reducers.wifi = {};

  reducers.wifi.aps = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = [];
    }

    if(action.type == SCANNING_COMPLETE) {
      return action.aps;
    }

    return state;
  }

  reducers.wifi.ap = {};
  reducers.wifi.ap.scan = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = null;
    }

    switch(action.type) {
    case SCANNING_COMPLETE:
      if(action.aps.length == 0) {
        return null;
      } else {
        return assign({}, action.aps[0]);
      }

    case CHANGE_SCAN_AP:
      return assign({}, action.ap);
    }

    return state;
  }

  reducers.wifi.ap.manual = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = {
        encryption: 7,
        ssid: ''
      }
    }

    switch(action.type) {
    case CHANGE_MANUAL_AP:
      var result = assign({}, state);
      result.ssid = action.ssid;
      return result;
    case CHANGE_SECURITY:
      var result = assign({}, state);
      result.encryption = action.encryption;
      return result;
    }

    return state;
  }

  reducers.wifi.encryption = {};
  reducers.wifi.encryption.scan = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = null;
    }
    switch(action.type) {
    case SCANNING_COMPLETE:
      if(action.aps.length == 0) {
        return null;
      } else {
        return action.aps[0].encryption
      }

    case CHANGE_SCAN_AP:
      return action.ap.encryption;
    }


    return state;
  }

  reducers.wifi.encryption.manual = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = 7;
    }

    switch(action.type) {
    case CHANGE_SECURITY:
      return action.encryption;
    }

    return state;
  }

  reducers.wifi.scan = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = true;
    }

    switch(action.type) {
      case WIFI_SCAN:
        return true;
      case WIFI_MANUAL:
        return false;
    };
    return state;
  }

  reducers.wifi.passkey = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = {
        changed: false,
        valid: false,
        error: null,
        value: ""
      }
    }

    if(action.type == CHANGE_PASSKEY) {
      var valid = action.value.length > 0 && action.value.length <= 32;

      return assign({}, state, {
        value: action.value,
        valid: valid,
        changed: true
      });
    }

    return state;
  }

  reducers.wifi.networkName = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = {
        changed: false,
        valid: false,
        error: null,
        value: ""
      }
    }

    if(action.type == CHANGE_MANUAL_AP) {
      var value = action.ssid;
      var valid = value.length > 0 && value.length <= 32;

      return assign({}, state, {
        value: value,
        valid: valid,
        changed: true
      });
    }

    return state;
  }



  reducers.wifi.deviceName = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = '';
    }

    if(action.type == CHANGE_DEVICE_NAME) {
      var value = action.value;
      var valid = value.length > 0 && value.length <= 64;

      return assign({}, state, {
        value: action.value,
        valid: valid,
        changed: true
      });
    }

    return state;
  }

  reducers.wifi.error = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = '';
    }

    if(action.type == CONNECTION_ERROR) {
      return action.message
    }

    return state;
  }

  reducers.wifi.connection = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = NOT_SCANNED;
    }
    // Since these types are literally used as state flags,
    // we can just return the type
    switch(action.type) {
    case SCANNING:
    case SCANNING_COMPLETE:
    case CONNECTED:
    case CONNECTION_ERROR:
      return action.type;
    default:
      return state;
    }
  }

  reducers.mqtt = {};
  reducers.mqtt.server = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = {
        changed: false,
        valid: false,
        error: null,
        value: ''
      }
    }

    return state;
  }

  reducers.mqtt.port = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = {
        changed: false,
        valid: false,
        error: null,
        value: 1883
      }
    }

    return state;
  }

  reducers.mqtt.tls = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = false;
    }

    return state;
  }

  reducers.mqtt.authenticate = function(state, action) {
    if(typeof(state) == 'undefined') {
      state = false;
    }

    return state;
  }

  function reduce(state, action, node) {
    var reduced = {};
    if(typeof(node) == 'undefined') {
      node = reducers;
    }

    for(var key in node) {
      if(node.hasOwnProperty(key)) {
        if(typeof(state) == "undefined") {
          state = {};
        }

        if(typeof(node[key]) == "function") {
          var func = node[key];
          reduced[key] = func(state[key], action);
        } else {
          reduced[key] = reduce(state[key], action, node[key]);
        }
      }
    }

    return reduced;
  }

  // Marks all the the nodes as changed. Not particulary efficient, as we JSON.stringify every
  // node, but we prefer small source over fast/low memory usage.
  function checkChanges(old, current) {
    var tree = {};
    for(var key in current) {
      if(current.hasOwnProperty(key)) {
        var t = {};
        if(typeof(current[key]) == "object") {
          t = checkChanges(old[key], current[key]);
        }

        t._value = current[key];

        if(typeof(old) !== "object" || old === null) { // Thanks JavaScript. Of course null is an object
          t._same = false;
        } else {
          t._same = JSON.stringify(old[key]) === JSON.stringify(current[key]);
        }
      }
      tree[key] = t;
    }
    return tree;
  }

  function dispatch(action) {
    var oldState = assign({}, state);
    console.log('oldState', oldState);
    state = reduce(oldState, action);
    var changes = checkChanges(oldState, state);

    console.log('state', state);
    console.log('changes', changes);
    render(changes);
  }

  // View functions
  function getElementById(id) {
    return document.getElementById(id);
  }

  function addClass(el, className) {
    if(el.className.indexOf(className) === -1) {
      var a = el.className.split(' ');
      a.push(className);
      el.className = a.join(' ');
    }
  }

  function removeClass(el, className) {
    var a = el.className.split(' ');
    var index = a.indexOf(className);

    if(index !== -1) {
      a.splice(index, 1)
      el.className = a.join(' ');
    }
  }

  var DISABLED = 'disabled';
  var HIDDEN = 'hidden';
  function enable(el) {
    el.removeAttribute(DISABLED);
  }

  function disable(el) {
    el.setAttribute(DISABLED, DISABLED);
  }

  function show(el) {
    removeClass(el, HIDDEN);
  }

  function hide(el) {
    addClass(el, HIDDEN);
  }

  function innerHTML(el, text) {
    el.innerHTML = text;
  }

  function renderTextInputValue(el, value) {
    var selectionStart = el.selectionStart,
        selectionEnd = el.selectionEnd;

    el.value = value;

    el.selectionStart = selectionStart;
    el.selectionEnd = selectionEnd;
  }

  var renderers = [
    function render_ssid_aps(changes) {
      var wifi = changes.wifi;
      if(wifi.connection._same &&
         wifi.aps._same &&
         wifi.ap._same) return;

      var ssid = getElementById('ssid');

      var aps = wifi.aps._value;
      var connection = wifi.connection._value;
      var selected = wifi.ap.scan._value;

      if(connection === SCANNING) {
        innerHTML(ssid, '<option>Scanning...</option>');
      } else if(connection === NOT_SCANNED || aps.length == 0) {
        innerHTML(ssid, '');
      } else {
        var html = [];
        for(var i = 0; i < aps.length; i++) {
          var ap = aps[i];
          html.push("<option value=\"" + ap.ssid + "\"" + (selected.ssid == ap.ssid ? " selected" : "") + ">" + ap.ssid + "</option>");
        }
        innerHTML(ssid, html.join(''));
      }
    },

    function render_ssid_visible(changes) {
      var scan = changes.wifi.scan;
      if(scan._same) return;
      var el = getElementById('ssid');

      if(scan._value) {
        show(el);
      } else {
        hide(el);
      }
    },

    function render_ssid_manual_visible(changes) {
      var scan = changes.wifi.scan;
      if(scan._same) return;
      var el = getElementById('ssid-manual');

      if(scan._value) {
        hide(el);
      } else {
        show(el);
      }
    },

    function render_select_scan_visible(changes) {
      var scan = changes.wifi.scan;
      if(scan._same) return;
      var el = getElementById('scan-network');

      if(scan._value) {
        hide(el);
      } else {
        show(el);
      }
    },

    function render_select_manual_visible(changes) {
      var scan = changes.wifi.scan;
      if(scan._same) return;
      var el = getElementById('manual-network');

      if(scan._value) {
        show(el);
      } else {
        hide(el);
      }
    },

    function render_security_wrapper_visible(changes) {
      var scan = changes.wifi.scan;
      if(scan._same) return;
      var el = getElementById('security-wrapper');

      if(scan._value) {
        hide(el);
      } else {
        show(el);
      }
    },

    function render_ssid_enabled(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;

      var ssid = getElementById('ssid');
      switch(connection._value) {
        case NOT_SCANNED:
        case SCANNING:
          disable(ssid);
          break;
        default:
          enable(ssid);
      }
    },

    function render_ssid_value(changes) {
      var value = changes.wifi.networkName.value;
      if(value._same) return;
      renderTextInputValue(getElementById('ssid-manual'), value._value);
    },

    function render_ssid_error(changes) {
      var ssid = changes.wifi.networkName;
      var scan = changes.wifi.scan;

      if(scan._same && ssid._same && ssid.valid._same && ssid.value._same) return;

      var value = ssid.value._value;

      var ssidError = getElementById('ssid-error');

      if(scan._value) {
        hide(ssidError);
      } else if(ssid.changed._value && !ssid.valid._value) {
        if(value.length == 0) {
          innerHTML(ssidError, 'is required');
        } else if(value.length >= 32) {
          innerHTML(ssidError, 'is too long');
        }
        show(ssidError);
      } else {
        hide(ssidError);
      }
    },

    function render_passkey_value(changes) {
      var value = changes.wifi.passkey.value;
      if(value._same) return;
      renderTextInputValue(getElementById('passkey'), value._value);
    },

    function render_passkey_visible(changes) {
      var encryption = changes.wifi.encryption;
      var scan = changes.wifi.scan;

      if(encryption._same && scan._same) return;

      var passkey = getElementById('passkey-wrapper');

      if(scan._value && encryption.scan._value == 7) {
        hide(passkey);
      } else if(!scan._value && encryption.manual._value == 7) {
        hide(passkey);
      } else {
        show(passkey);
      }
    },

    function render_passkey_error(changes) {
      var passkey = changes.wifi.passkey;
      if(passkey._same && passkey.valid._same && passkey.value._same) return;

      var value = passkey.value._value;

      var passkeyError = getElementById('passkey-error');

      if(passkey.changed._value && !passkey.valid._value) {
        if(value.length == 0) {
          innerHTML(passkeyError, 'is required');
        } else if(value.length >= 32) {
          innerHTML(passkeyError, 'is too long');
        }
        show(passkeyError);
      } else {
        hide(passkeyError);
      }
    },

    function render_button_disabled(changes) {
      var wifi = changes.wifi;

      if(wifi.scan._same &&
         wifi.connection._same &&
         wifi.encryption.scan._same &&
         wifi.passkey.valid._same &&
         wifi.networkName.value._same &&
         wifi.encryption.manual._same) return;

      var button = getElementById('button');

      if(wifi.scan._value && wifi.connection._value === SCANNING_COMPLETE && (wifi.encryption.scan._value === 7 || wifi.passkey.valid._value)) {
        enable(button);
      } else if(!wifi.scan._value && wifi.networkName.valid._value && (wifi.encryption.manual._value === 7 || wifi.passkey.valid._value)) {
        enable(button);
      } else {
        disable(button);
      }
    },

    function render_button_value(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;

      var button = getElementById('button');
      if(connection._value === SAVING) {
        innerHTML(button, "Connecting...");
      } else {
        innerHTML(button, "Connect");
      }
    },

    function render_notification(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;

      var notification = getElementById('notification');
      if(connection === CONNECTED) {
        show(notification);
      } else {
        hide(notification);
      }
    },

    function render_error(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;

      var error = getElementById('error');
      if(connection === CONNECTION_ERROR) {
        error.innerHTML = state.error;
        show(error);
      } else {
        hide(error);
      }
    }
  ];

  function render(changes) {
    for(var i = 0; i < renderers.length; i++) {
      renderers[i](changes);
    }
  }

  function browse() {
    dispatch({ type: SCANNING });

    ajax("/browse.json", "GET", null, function(text) {
      dispatch({ type: SCANNING_COMPLETE, aps: JSON.parse(text) });
    });
  }

  function changeScanAP(event) {
    event.preventDefault();

    var ap = null;
    var aps = state.wifi.aps;
    for(var i = 0; i < aps.length; i++) {
      if(aps[i].ssid == event.target.value) {
        ap = aps[i];
      }
    }

    dispatch({
      type: CHANGE_SCAN_AP,
      ap: ap
    });
  }

  function changeManualAP(event) {
    dispatch({
      type: CHANGE_MANUAL_AP,
      ssid: event.target.value
    });
  }

  function changeSecurity(event) {
    dispatch({
      type: CHANGE_SECURITY,
      encryption: parseInt(event.target.value)
    });
  }

  function changePasskey(event) {
    event.preventDefault();

    dispatch({
      type: CHANGE_PASSKEY,
      value: event.target.value
    });
  }

  function onSave(event) {
    event.preventDefault();

    var ssid = state.wifi.ap.scan.ssid;
    var passkey = state.wifi.passkey.value;

    var data = "ssid=" + ssid;
    if(state.wifi.ap.scan.encryption != 7) {
      data += "&passkey=" + passkey;
    }

    dispatch({ type: SAVING });

    ajax("/save", "POST", data, function() {
      dispatch({ type: CONNECTED });
    }, function(message) {
      dispatch({ type: CONNECTION_ERROR, message: message });
    });
  }

  function scanMode(event) {
    event.preventDefault();
    dispatch({ type: WIFI_SCAN });
  }

  function manualMode(event) {
    event.preventDefault();
    dispatch({ type: WIFI_MANUAL });
  }

  getElementById('ssid').addEventListener('change', changeScanAP, true);
  getElementById('ssid-manual').addEventListener('input', changeManualAP, true);
  getElementById('passkey').addEventListener('input', changePasskey, true);
  getElementById('form').addEventListener('submit', onSave, true);
  getElementById('scan-network').addEventListener('click', scanMode, true);
  getElementById('manual-network').addEventListener('click', manualMode, true);
  getElementById('security').addEventListener('change', changeSecurity, true);

  // Run reduce once with not action to initialise the state
  state = reduce(state, { type: null });
  browse();
})();
