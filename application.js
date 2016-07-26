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

  var CHANGE_MQTT_DEVICE_NAME = 8;
  var CHANGE_MQTT_SERVER = 9;
  var CHANGE_MQTT_TLS = 10;
  var CHANGE_MQTT_AUTHENTICATION = 11;
  var CHANGE_MQTT_AUTH_MODE = 12

  var NOT_SCANNED = 13;
  var SCANNING = 14;
  var SCANNING_COMPLETE = 15;
  var SAVING = 16;
  var CONNECTED = 17;
  var CONNECTION_ERROR = 18;

  var WIFI_SCAN = 19;
  var WIFI_MANUAL = 20;

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

  function isUndefined(value) {
    return typeof(value) === 'undefined'; 
  }

  function isFunction(value) {
    return typeof(value) === 'function';
  }

  function isObject(value) {
    return typeof(value) === 'object' && value !== null;
  }

  var reducers = {
    wifi: {
      aps: function(state, action) {
        if(isUndefined(state)) {
          state = [];
        }

        if(action.type == SCANNING_COMPLETE) {
          return action.aps;
        }

        return state;
      },

      ap: {
        scan: function(state, action) {
          if(isUndefined(state)) {
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
        },

        manual: function(state, action) {
          if(isUndefined(state)) {
            state = {
              encryption: 7,
              ssid: ''
            }
          }

          switch(action.type) {
          case CHANGE_MANUAL_AP:
            var result = assign({}, state);
            result.ssid = action.value;
            return result;
          case CHANGE_SECURITY:
            var result = assign({}, state);
            result.encryption = action.value;
            return result;
          }

          return state;
        }
      },
      
      encryption: {
        scan: function(state, action) {
          if(isUndefined(state)) {
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
        },

        manual: function(state, action) {
          if(isUndefined(state)) {
            state = 7;
          }

          if(action.type == CHANGE_SECURITY) {
            return action.value;
          }

          return state;
        }
      },

      scan: function(state, action) {
        if(isUndefined(state)) {
          state = true;
        }

        switch(action.type) {
          case WIFI_SCAN:
            return true;
          case WIFI_MANUAL:
            return false;
        };
        
        return state;
      },

      passkey: function(state, action) {
        if(isUndefined(state)) {
          state = {
            changed: false,
            valid: false,
            error: null,
            value: ""
          }
        }

        if(action.type == CHANGE_PASSKEY) {
          var value = action.value;
          var valid = value.length > 0 && value.length <= 32;

          return assign({}, state, {
            value: value,
            valid: valid,
            changed: true
          });
        }

        return state;
      },

      networkName: function(state, action) {
        if(isUndefined(state)) {
          state = {
            changed: false,
            valid: false,
            error: null,
            value: ""
          }
        }

        if(action.type == CHANGE_MANUAL_AP) {
          var value = action.value;
          var valid = value.length > 0 && value.length <= 32;

          return assign({}, state, {
            value: value,
            valid: valid,
            changed: true
          });
        }

        return state;
      },

      error: function(state, action) {
        if(isUndefined(state)) {
          state = '';
        }

        if(action.type == CONNECTION_ERROR) {
          return action.message
        }

        return state;
      },

      connection: function(state, action) {
        if(isUndefined(state)) {
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
        }
        
        return state;
      }
    },

    mqtt: {
      deviceName: function(state, action) {
        if(isUndefined(state)) {
          state = '';
        }

        if(action.type == CHANGE_MQTT_DEVICE_NAME) {
          var value = action.value;
          var valid = value.length > 0 && value.length <= 64;

          return assign({}, state, {
            value: action.value,
            valid: valid,
            changed: true
          });
        }

        return state;
      },
      
      server: function(state, action) {
        if(isUndefined(state)) {
          state = {
            changed: false,
            valid: false,
            error: null,
            value: ''
          }
        }

        return state;
      },

      port: function(state, action) {
        if(isUndefined(state)) {
          state = {
            changed: false,
            valid: false,
            error: null,
            value: 1883
          }
        }

        return state;
      },

      tls: function(state, action) {
        if(isUndefined(state)) {
          state = false;
        }

        return state;
      },

      authenticate: function(state, action) {
        if(isUndefined(state)) {
          state = false;
        }

        return state;
      }
    }
  }

  function reduce(state, action, node) {
    var reduced = {};
    if(isUndefined(node)) {
      node = reducers;
    }

    for(var key in node) {
      if(node.hasOwnProperty(key)) {
        if(isUndefined(state)) {
          state = {};
        }

        var child = node[key];
        if(isFunction(child)) {
          var func = child;
          reduced[key] = func(state[key], action);
        } else {
          reduced[key] = reduce(state[key], action, child);
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
        if(isObject(current[key])) {
          t = checkChanges(old[key], current[key]);
        }

        t._val = current[key];

        if(!isObject(old)) {
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
    state = reduce(oldState, action);
    console.log('state', state);
    var changes = checkChanges(oldState, state);
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

      var aps = wifi.aps._val;
      var connection = wifi.connection._val;
      var selected = wifi.ap.scan._val;

      if(connection === SCANNING) {
        innerHTML(ssid, '<option>Scanning...</option>');
      } else if(connection === NOT_SCANNED || aps.length == 0) {
        innerHTML(ssid, '');
      } else {
        var html = '';
        for(var i = 0; i < aps.length; i++) {
          var ap = aps[i];
          html += "<option value=\"" + ap.ssid + "\"" + (selected.ssid == ap.ssid ? " selected" : "") + ">" + ap.ssid + "</option>";
        }
        innerHTML(ssid, html);
      }
    },

    function render_scan_visible(changes) {
      var scan = changes.wifi.scan;
      if(scan._same) return;
      
      var showOnScan = [ 'ssid', 'manual-network' ];
      var hideOnScan = [ 'ssid-manual', 'scan-network', 'security-wrapper' ];

      for(var i = 0; i < showOnScan.length; i++) {
        var id = showOnScan[i];
        var el = getElementById(id);

        if(scan._val) {
          show(el);
        } else {
          hide(el);
        }
      }

      for(var i = 0; i < hideOnScan.length; i++) {
        var id = hideOnScan[i];
        var el = getElementById(id);

        if(scan._val) {
          hide(el);
        } else {
          show(el);
        }
      }
    },

    function render_ssid_enabled(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;

      var ssid = getElementById('ssid');
      switch(connection._val) {
        case NOT_SCANNED:
        case SCANNING:
          disable(ssid);
          break;
        default:
          enable(ssid);
      }
    },

    function render_ssid_val(changes) {
      var value = changes.wifi.networkName.value;
      if(value._same) return;
      renderTextInputValue(getElementById('ssid-manual'), value._val);
    },

    // OPTIMISE
    function render_ssid_error(changes) {
      var ssid = changes.wifi.networkName;
      var scan = changes.wifi.scan;

      if(scan._same && ssid._same && ssid.valid._same && ssid.value._same) return;

      var value = ssid.value._val;

      var ssidError = getElementById('ssid-error');

      if(scan._val) {
        hide(ssidError);
      } else if(ssid.changed._val && !ssid.valid._val) {
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

    function render_passkey_val(changes) {
      var value = changes.wifi.passkey.value;
      if(value._same) return;
      renderTextInputValue(getElementById('passkey'), value._val);
    },

    function render_passkey_visible(changes) {
      var encryption = changes.wifi.encryption;
      var scan = changes.wifi.scan;

      if(encryption._same && scan._same) return;

      var passkey = getElementById('passkey-wrapper');

      if(scan._val && encryption.scan._val == 7) {
        hide(passkey);
      } else if(!scan._val && encryption.manual._val == 7) {
        hide(passkey);
      } else {
        show(passkey);
      }
    },

    function render_passkey_error(changes) {
      var passkey = changes.wifi.passkey;
      if(passkey._same && passkey.valid._same && passkey.value._same) return;

      var value = passkey.value._val;

      var passkeyError = getElementById('passkey-error');

      if(passkey.changed._val && !passkey.valid._val) {
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

      if(wifi.scan._val && wifi.connection._val === SCANNING_COMPLETE && (wifi.encryption.scan._val === 7 || wifi.passkey.valid._val)) {
        enable(button);
      } else if(!wifi.scan._val && wifi.networkName.valid._val && (wifi.encryption.manual._val === 7 || wifi.passkey.valid._val)) {
        enable(button);
      } else {
        disable(button);
      }
    },

    function render_button_val(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;
      innerHTML(getElementById('button'), connection._val === SAVING ? "Connecting..." : "Connect");
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

  function addEventListener(element, event, func) {
    element.addEventListener(event, func, true);
  }

  function clickEvent(type) {
    return function(event) {
      event.preventDefault();
      dispatch({ type: type });
    }
  }

  function changeEvent(type) {
    return function(event) {
      dispatch({
        type: type,
        value: event.target.value
      });
    }
  }

  addEventListener(getElementById('ssid'), 'change', changeScanAP);
  addEventListener(getElementById('ssid-manual'), 'input', changeEvent(CHANGE_MANUAL_AP));
  addEventListener(getElementById('passkey'), 'input', changeEvent(CHANGE_PASSKEY));
  addEventListener(getElementById('mqttDeviceName'), 'input', changeEvent(CHANGE_MQTT_DEVICE_NAME));
  addEventListener(getElementById('mqttServer'), 'input', changeEvent(CHANGE_MQTT_SERVER));
  
  addEventListener(getElementById('scan-network'), 'click', clickEvent(WIFI_SCAN));
  addEventListener(getElementById('manual-network'), 'click', clickEvent(WIFI_MANUAL));
  addEventListener(getElementById('security'), 'change', changeEvent(CHANGE_SECURITY));
  addEventListener(getElementById('mqttTLS'), 'change', changeEvent(CHANGE_MQTT_TLS));
  addEventListener(getElementById('mqttAuthMode-none'), 'change', changeEvent(CHANGE_MQTT_AUTH_MODE));
  addEventListener(getElementById('mqttAuthMode-username'), 'change', changeEvent(CHANGE_MQTT_AUTH_MODE));
  addEventListener(getElementById('mqttAuthMode-certificate'), 'change', changeEvent(CHANGE_MQTT_AUTH_MODE));
  

  addEventListener(getElementById('form'), 'submit', onSave);

  // Run reduce once with not action to initialise the state
  state = reduce(state, { type: null });
  browse();
})();
