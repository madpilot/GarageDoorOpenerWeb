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
  var CHANGE_MQTT_PORT = 10;
  var CHANGE_MQTT_TLS = 11;
  var CHANGE_MQTT_AUTHENTICATION = 12;
  var CHANGE_MQTT_AUTH_MODE = 13;

  var NOT_SCANNED = 14;
  var SCANNING = 15;
  var SCANNING_COMPLETE = 16;
  var SAVING = 17;
  var CONNECTED = 18;
  var CONNECTION_ERROR = 19;

  var WIFI_SCAN = 20;
  var WIFI_MANUAL = 21;

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

  function initialiseTextField() {
    return {
      changed: false,
      valid: false,
      error: null,
      value: ''
    }
  }

  function trim(val) {
    return val.replace(/^\s+|\s+$/g, '');
  }

  function validatePresence() {
    return function(obj) {
      if(trim(obj.value + '') == "") {
        return assign({}, obj, {
          valid: false,
          error: "is required"
        });
      }
      return obj;
    }
  }

  function validateLength(len) {
    return function(obj) {
      if(trim(obj.value + '').length > len) {
        return assign({}, obj, {
          valid: false,
          error: "is too long"
        });
      }
      return obj;
    }
  }

  function validate(obj, validators) {
    obj = assign({}, obj, {
      valid: true,
      error: null
    });
    for(var i = 0; i < validators.length; i++) {
      obj = validators[i](obj);
    }
    return obj;
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
          state = initialiseTextField();
        }

        if(action.type == CHANGE_PASSKEY) {
          var value = action.value;

          return validate(assign({}, state, {
            value: value,
            changed: true
          }), [ validatePresence(), validateLength(32) ]);
        }

        return state;
      },

      networkName: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MANUAL_AP) {
          var value = action.value;

          return validate(assign({}, state, {
            value: value,
            changed: true
          }), [ validatePresence(), validateLength(32) ]);
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
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_DEVICE_NAME) {
          var value = action.value;

          return validate(assign({}, state, {
            value: action.value,
            changed: true
          }), [ validatePresence(), validateLength(64) ]);
        }

        return state;
      },
     
      server: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_SERVER) {
          return validate(assign({}, state, {
            changed: true,
            value: action.value
          }), [ validatePresence(), validateLength(64) ]);
          return result;
        }

        return state;
      },

      port: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
          state.nonce = '';
        }

        if(action.type == CHANGE_MQTT_PORT) {
          var value = parseInt(action.value.replace(/\D*|\-*/g, ''));
          
          if(isNaN(value)) {
            value = "";
          }
          
          return validate(assign({}, state, {
            changed: true,
            nonce: (new Date()).getTime(),
            value: value
          }), [ validatePresence(), validateLength(5) ]);
        }

        return state;
      },

      tls: function(state, action) {
        if(isUndefined(state)) {
          state = false;
        }
        
        if(action.type === CHANGE_MQTT_TLS) {
          return action.value;
        }
        
        return state;
      },

      authenticate: function(state, action) {
        if(isUndefined(state)) {
          state = 0;
        }

        if(action.type === CHANGE_MQTT_AUTH_MODE) {
          return action.value 
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

  function renderError(el, obj) {
    if(obj.valid._val) {
      hide(el);
    } else {
      innerHTML(el, obj.error._val);
      show(el);
    }
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
      var networkName = changes.wifi.networkName;
      var value = networkName.value;
      if(value._same) return;
      renderTextInputValue(getElementById('ssid-manual'), value._val);
      renderError(getElementById('ssid-error'), networkName);
    },

    function render_passkey_val(changes) {
      var passkey = changes.wifi.passkey;
      var value = passkey.value;
      if(value._same) return;
      renderTextInputValue(getElementById('passkey'), value._val);
      renderError(getElementById('passkey-error'), passkey);
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
    },

    function render_tls(changes) {
      var tls = changes.mqtt.tls;
      var authenticate = changes.mqtt.authenticate;

      //if(tls._same && authenticate._same) return;

      var el = getElementById('mqttTLS');
      el.checked = tls._val || authenticate._val == 2;
    },

    function render_mqtt_authentication_visible(changes) {
      var authenticate = changes.mqtt.authenticate;

      if(authenticate._same) return;

      var password = getElementById('mqttAuthType-password');
      var certificate = getElementById('mqttAuthType-certificate');

      switch(authenticate._val) {
        case 0:
          hide(password);
          hide(certificate);
          break;
        case 1:
          show(password);
          hide(certificate);
          break;
        case 2:
          hide(password);
          show(certificate);
          break;
      }
    },

    function render_device_name(changes) {
      var deviceName = changes.mqtt.deviceName;

      if(deviceName._same) return;
      var el = getElementById('mqttDeviceName');
      renderTextInputValue(el, deviceName.value._val);
      renderError(getElementById('mqttDeviceName-error'), deviceName);
    },

    function render_server(changes) {
      var server = changes.mqtt.server;

      if(server._same) return;
      var el = getElementById('mqttServer');
      renderTextInputValue(el, server.value._val);
      renderError(getElementById('mqttServer-error'), server);
    },

    function render_port(changes) {
      var port = changes.mqtt.port;
      var tls = changes.mqtt.tls;
      var authenticate = changes.mqtt.authenticate;

      if(port._same && tls._same && authenticate._same) return;

      var el = getElementById('mqttPort');
      var val = port.value._val;
      
      if(val == "" && !port.changed._val) {
        if(tls._val || authenticate._val == 2) {
          el.value = 8883;
        } else {
          el.value = 1883;
        }
      } else {
        el.value = val;
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

  function changeEvent(type, parser) {
    if(isUndefined(parser)) {
      parser = function(a) { return a; };
    }

    return function(event) {
      dispatch({
        type: type,
        value: parser(event.target.value)
      });
    }
  }

  function changeCheckboxEvent(type) {
    return function(event) {
      dispatch({
        type: type,
        value: event.target.checked
      });
    }
  }

  addEventListener(getElementById('ssid'), 'change', changeScanAP);
  addEventListener(getElementById('ssid-manual'), 'input', changeEvent(CHANGE_MANUAL_AP));
  addEventListener(getElementById('passkey'), 'input', changeEvent(CHANGE_PASSKEY));
  addEventListener(getElementById('mqttDeviceName'), 'input', changeEvent(CHANGE_MQTT_DEVICE_NAME));
  addEventListener(getElementById('mqttServer'), 'input', changeEvent(CHANGE_MQTT_SERVER));
  addEventListener(getElementById('mqttPort'), 'input', changeEvent(CHANGE_MQTT_PORT));
  
  addEventListener(getElementById('scan-network'), 'click', clickEvent(WIFI_SCAN));
  addEventListener(getElementById('manual-network'), 'click', clickEvent(WIFI_MANUAL));
  addEventListener(getElementById('security'), 'change', changeEvent(CHANGE_SECURITY));
  
  addEventListener(getElementById('mqttServer'), 'change', changeEvent(CHANGE_MQTT_SERVER));
  addEventListener(getElementById('mqttTLS'), 'change', changeCheckboxEvent(CHANGE_MQTT_TLS));
  addEventListener(getElementById('mqttAuthMode-none'), 'change', changeEvent(CHANGE_MQTT_AUTH_MODE, parseInt));
  addEventListener(getElementById('mqttAuthMode-username'), 'change', changeEvent(CHANGE_MQTT_AUTH_MODE, parseInt));
  addEventListener(getElementById('mqttAuthMode-certificate'), 'change', changeEvent(CHANGE_MQTT_AUTH_MODE, parseInt));

  addEventListener(getElementById('form'), 'submit', onSave);

  // Run reduce once with no action to initialise the state
  state = reduce(state, { type: null });
  browse();
})();
