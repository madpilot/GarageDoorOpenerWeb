(function() {
  // Constants
  // Minify will turn these in to short variables
  var FETCH_APS = 1;
  var FETCHING_APS = 2;
  var FETCHED_APS = 3;

  var FETCHING_CONFIG = 4;
  var FETCHED_CONFIG = 5;

  var CHANGE_SCAN_AP = 6;
  var CHANGE_MANUAL_AP = 7;
  var CHANGE_ENCRYPTION = 8;
  var CHANGE_PASSKEY = 9;

  var CHANGE_MQTT_DEVICE_NAME = 10;
  var CHANGE_MQTT_SERVER = 11;
  var CHANGE_MQTT_PORT = 12;
  var CHANGE_MQTT_TLS = 13;
  var CHANGE_MQTT_AUTHENTICATION = 14;
  var CHANGE_MQTT_AUTH_MODE = 15;
  var CHANGE_MQTT_USERNAME = 16;
  var CHANGE_MQTT_PASSWORD = 17;
  var CHANGE_MQTT_CERT = 18;
  var CHANGE_MQTT_CERT_KEY = 19;
  var CHANGE_MQTT_FINGERPRINT = 20;

  var NOT_SCANNED = 21;
  var SCANNING = 22;
  var SCANNING_COMPLETE = 23;
  var SAVING = 24;
  var CONNECTED = 25;
  var CONNECTION_ERROR = 26;

  var WIFI_SCAN = 27;
  var WIFI_MANUAL = 28;

  // Replace common strings with constants so the minifier minifies them
  var INPUT = "input";
  var CHANGE = "change"
  var CLICK = "click";

  var SSID = 'ssid';
  var SSID_MANUAL = SSID + '-manual';
  var PASSKEY = 'passkey';
  var ENCRYPTION = 'encryption';
  var MQTT = 'mqtt';
  var MQTT_DEVICE_NAME = MQTT + 'DeviceName';
  var MQTT_SERVER = MQTT + 'Server';
  var MQTT_PORT = MQTT + 'Port';
  var MQTT_USERNAME = MQTT + 'Username';
  var MQTT_PASSWORD = MQTT + 'Password';
  var MQTT_CERT = MQTT + 'Cert';
  var MQTT_CERT_KEY = MQTT_CERT + 'Key';
  var MQTT_FINGERPRINT = MQTT + 'Fingerprint';
  var MQTT_TLS = MQTT + 'TLS';
  var MQTT_AUTH_MODE = MQTT + 'AuthMode';

  var DASH_ERROR = '-error';

  var AUTH_MODE_NONE = '0';
  var AUTH_MODE_USERNAME = '1';
  var AUTH_MODE_CERTIFICATE = '2';

  var ENCRYPTION_NONE = "7";
  var ENCRYPTION_WEP = "1";
  var ENCRYPTION_WPA_PERSONAL = "2";
  var ENCRYPTION_WPA2_PERSONAL = "4";
  
  var TLS_ON = "1";
  var TLS_OFF = "0";

  var MQTT_PORT_NUMBER = 1883;
  var MQTT_TLS_PORT_NUMBER = 8883;

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
    if(!obj.changed) {
      return obj;
    }
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
              encryption: ENCRYPTION_NONE,
              ssid: ''
            }
          }

          switch(action.type) {
          case CHANGE_MANUAL_AP:
            var result = assign({}, state);
            result.ssid = action.value;
            return result;
          case CHANGE_ENCRYPTION:
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
            state = ENCRYPTION_NONE;
          }

          if(action.type == CHANGE_ENCRYPTION) {
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
          state.value = "garage";
          state.valid = true;
        }

        if(action.type == CHANGE_MQTT_DEVICE_NAME) {
          var value = action.value;

          return validate(assign({}, state, {
            value: action.value,
            changed: !action.fromConfig,
          }), [ validatePresence(), validateLength(32) ]);
        }

        return state;
      },

      server: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_SERVER) {
          return validate(assign({}, state, {
            changed: !action.fromConfig,
            value: action.value
          }), [ validatePresence(), validateLength(32) ]);
        }

        return state;
      },

      port: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
          state.prevVal = MQTT_PORT_NUMBER;
          state.value = MQTT_PORT_NUMBER;
          state.valid = true;
          state.nonce = '';
        }

        switch(action.type) {
        case CHANGE_MQTT_PORT:
          var value = parseInt(action.value.replace(/\D*|\-*/g, ''));

          if(isNaN(value)) {
            value = "";
          }

          return validate(assign({}, state, {
            changed: !action.fromConfig,
            nonce: (new Date()).getTime(),
            prevVal: value,
            value: value
          }), [ validatePresence(), validateLength(5) ]);
        
        case CHANGE_MQTT_TLS:
         if(!state.changed) {
            var value = action.value == TLS_ON ? MQTT_TLS_PORT_NUMBER : MQTT_PORT_NUMBER;
            
            return assign({}, state, {
              prevVal: value,
              value: value
            });
          }
       
        case CHANGE_MQTT_AUTH_MODE:
          if(!state.changed) {
            var value = action.value == AUTH_MODE_CERTIFICATE ? MQTT_TLS_PORT_NUMBER : state.prevVal;
            
            return assign({}, state, {
              value: value
            });
          }
        }

        return state;
      },

      tls: function(state, action) {
        if(isUndefined(state)) {
          state = {
            ui: TLS_OFF,
            value: false
          }
        }

        switch(action.type) {
        case CHANGE_MQTT_TLS:
          return {
            ui: action.value,
            value: action.value == TLS_ON
          }
        case CHANGE_MQTT_AUTH_MODE:
          var cert = action.value == AUTH_MODE_CERTIFICATE;
          var current = state.ui == TLS_ON;
          
          return assign({}, state, {
            value: cert ? true : current
          });
        }

        return state;
      },

      authMode: function(state, action) {
        if(isUndefined(state)) {
          state = "0";
        }

        if(action.type === CHANGE_MQTT_AUTH_MODE) {
          return action.value
        }

        return state;
      },

      username: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_USERNAME) {
          return validate(assign({}, state, {
            changed: !action.fromConfig,
            value: action.value
          }), [ validatePresence(), validateLength(32) ]);
        }

        return state;
      },

      password: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_PASSWORD) {
          return validate(assign({}, state, {
            changed: !action.fromConfig,
            value: action.value
          }), [ validatePresence(), validateLength(32) ]);
        }

        return state;
      },

      certificate: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_CERT) {
          return validate(assign({}, state, {
            changed: !action.fromConfig,
            value: action.value
          }), [ validatePresence() ]);
        }

        return state;
      },

      secretKey: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_CERT_KEY) {
          return validate(assign({}, state, {
            changed: !action.fromConfig,
            value: action.value
          }), [ validatePresence() ]);
        }

        return state;
      },

      fingerprint: function(state, action) {
        if(isUndefined(state)) {
          state = initialiseTextField();
        }

        if(action.type == CHANGE_MQTT_FINGERPRINT) {
          return validate(assign({}, state, {
            changed: !action.fromConfig,
            value: action.value
          }), []);
        }

        return state;
      },
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

      var showOnScan = [ SSID, 'manual-network' ];
      var hideOnScan = [ SSID_MANUAL, 'scan-network', 'encryption-wrapper' ];

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

      var ssid = getElementById(SSID);
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
      renderTextInputValue(getElementById(SSID_MANUAL), value._val);
      renderError(getElementById(SSID + DASH_ERROR), networkName);
    },

    function render_passkey_val(changes) {
      var passkey = changes.wifi.passkey;
      var value = passkey.value;
      if(value._same) return;
      renderTextInputValue(getElementById(PASSKEY), value._val);
      renderError(getElementById(PASSKEY + DASH_ERROR), passkey);
    },

    function render_encryption(changes) {
      var encryption = changes.wifi.encryption;
      if(encryption._same) return;
      var el = getElementById(ENCRYPTION);
      el.value = encryption.manual._val;
    },

    function render_passkey_visible(changes) {
      var encryption = changes.wifi.encryption;
      var scan = changes.wifi.scan;

      if(encryption._same && scan._same) return;

      var passkey = getElementById('passkey-wrapper');

      if(scan._val && encryption.scan._val == ENCRYPTION_NONE) {
        hide(passkey);
      } else if(!scan._val && encryption.manual._val == ENCRYPTION_NONE) {
        hide(passkey);
      } else {
        show(passkey);
      }
    },

    function render_authMode(changes) {
      var authMode = changes.mqtt.authMode;

      if(authMode._same) return;
      
      var none = getElementById('mqttAuthMode-none');
      var username = getElementById('mqttAuthMode-username');
      var certificate = getElementById('mqttAuthMode-certificate');

      none.checked = authMode._val == AUTH_MODE_NONE;
      username.checked = authMode._val == AUTH_MODE_USERNAME;
      certificate.checked = authMode._val == AUTH_MODE_CERTIFICATE;
    },

    function render_button_disabled(changes) {
      var wifi = changes.wifi;
      var mqtt = changes.mqtt;

      if(wifi.scan._same &&
         wifi.connection._same &&
         wifi.encryption.scan._same &&
         wifi.passkey.valid._same &&
         wifi.networkName.value._same &&
         wifi.encryption.manual._same &&
         mqtt.deviceName.valid._same &&
         mqtt.server.valid._same &&
         mqtt.port.valid._same &&
         mqtt.authMode._same &&
         mqtt.username.valid._same &&
         mqtt.password.valid._same &&
         mqtt.certificate.valid._same &&
         mqtt.secretKey.valid._same) return;

      var button = getElementById('button');

      var wifiValid, mqttValid;

      if(wifi.scan._val && wifi.connection._val === SCANNING_COMPLETE && (wifi.encryption.scan._val === ENCRYPTION_NONE || wifi.passkey.valid._val)) {
        wifiValid = true;
      } else if(!wifi.scan._val && wifi.networkName.valid._val && (wifi.encryption.manual._val === ENCRYPTION_NONE || wifi.passkey.valid._val)) {
        wifiValid = true;
      } else {
        wifiValid = false;
      }

      if(mqtt.deviceName.valid._val && mqtt.server.valid._val && mqtt.port.valid._val) {
        switch(mqtt.authMode._val) {
          case AUTH_MODE_NONE:
            mqttValid = true;
            break
          case AUTH_MODE_USERNAME:
            mqttValid = mqtt.username.valid._val && mqtt.password.valid._val;
            break;
          case AUTH_MODE_CERTIFICATE:
            mqttValid = mqtt.certificate.valid._val && mqtt.secretKey.valid._val;
            break;
        }
      } else {
        mqttValid = false;
      }

      if(wifiValid && mqttValid) {
        enable(button);
      } else {
        disable(button);
      }
    },

    function render_button_val(changes) {
      var connection = changes.wifi.connection;
      if(connection._same) return;
      innerHTML(getElementById('button'), connection._val === SAVING ? "Saving..." : "Save");
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
      if(tls._same) return;
      var el = getElementById(MQTT_TLS);
      el.checked = tls.value._val || tls.ui.val == TLS_ON;
    },

    function render_mqtt_authentication_visible(changes) {
      var authMode = changes.mqtt.authMode;

      if(authMode._same) return;

      var password = getElementById('mqttAuthType-password');
      var certificate = getElementById('mqttAuthType-certificate');

      switch(authMode._val) {
        case AUTH_MODE_NONE:
          hide(password);
          hide(certificate);
          break;
        case AUTH_MODE_USERNAME:
          show(password);
          hide(certificate);
          break;
        case AUTH_MODE_CERTIFICATE:
          hide(password);
          show(certificate);
          break;
      }
    },

    function render_device_name(changes) {
      var deviceName = changes.mqtt.deviceName;

      if(deviceName._same) return;
      var el = getElementById(MQTT_DEVICE_NAME);
      renderTextInputValue(el, deviceName.value._val);
      renderError(getElementById(MQTT_DEVICE_NAME + DASH_ERROR), deviceName);
    },

    function render_server(changes) {
      var server = changes.mqtt.server;

      if(server._same) return;
      var el = getElementById(MQTT_SERVER);
      renderTextInputValue(el, server.value._val);
      renderError(getElementById(MQTT_SERVER + DASH_ERROR), server);
    },

    function render_port(changes) {
      var port = changes.mqtt.port;

      if(port._same) return;

      var el = getElementById(MQTT_PORT);
      el.value = port.value._val;
    },

    function render_username(changes) {
      var username = changes.mqtt.username;

      if(username._same) return;
      var el = getElementById(MQTT_USERNAME);
      renderTextInputValue(el, username.value._val);
      renderError(getElementById(MQTT_USERNAME + DASH_ERROR), username);
    },

    function render_password(changes) {
      var password = changes.mqtt.password;

      if(password._same) return;
      var el = getElementById(MQTT_PASSWORD);
      renderTextInputValue(el, password.value._val);
      renderError(getElementById(MQTT_PASSWORD + DASH_ERROR), password);
    },

    function render_certificate(changes) {
      var certificate = changes.mqtt.certificate;

      if(certificate._same) return;
      var el = getElementById(MQTT_CERT);
      renderTextInputValue(el, certificate.value._val);
      renderError(getElementById(MQTT_CERT + DASH_ERROR), certificate);
    },

    function render_secretKey(changes) {
      var secretKey = changes.mqtt.secretKey;

      if(secretKey._same) return;
      var el = getElementById(MQTT_CERT_KEY);
      renderTextInputValue(el, secretKey.value._val);
      renderError(getElementById(MQTT_CERT_KEY + DASH_ERROR), secretKey);
    },

    function render_fingerprint(changes) {
      var fingerprint = changes.mqtt.fingerprint;

      if(fingerprint._same) return;
      var el = getElementById(MQTT_FINGERPRINT);
      renderTextInputValue(el, fingerprint.value._val);
      renderError(getElementById(MQTT_FINGERPRINT + DASH_ERROR), fingerprint);
    },

    function render_finderprint_visible(changes) {
      var tls = changes.mqtt.tls;

      if(tls._same) return;

      var el = getElementById(MQTT_FINGERPRINT + "-wrapper");
      if(tls.value._val) {
        show(el);
      } else {
        hide(el);
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

  function updateFromConfig(json) {
    var mapping = {}
    mapping[SSID] = CHANGE_MANUAL_AP;
    mapping[PASSKEY] = CHANGE_PASSKEY;
    mapping[ENCRYPTION] = CHANGE_ENCRYPTION;
    mapping[MQTT_DEVICE_NAME] = CHANGE_MQTT_DEVICE_NAME;
    mapping[MQTT_SERVER] = CHANGE_MQTT_SERVER;
    mapping[MQTT_TLS] = CHANGE_MQTT_TLS;
    mapping[MQTT_AUTH_MODE] = CHANGE_MQTT_AUTH_MODE;
    mapping[MQTT_USERNAME] = CHANGE_MQTT_USERNAME;
    mapping[MQTT_PASSWORD] = CHANGE_MQTT_PASSWORD;
    mapping[MQTT_CERT] = CHANGE_MQTT_CERT;
    mapping[MQTT_CERT_KEY] = CHANGE_MQTT_CERT_KEY;
    mapping[MQTT_FINGERPRINT] = CHANGE_MQTT_FINGERPRINT;

    for(var key in json) {
      if(typeof(mapping[key]) !== "undefined") {
        dispatch({ type: mapping[key], value: json[key], fromConfig: true });
      }
    }
   
    var defaultPort = json[MQTT_PORT] == "1883" || json[MQTT_PORT] == "8883";
    dispatch({ type: CHANGE_MQTT_PORT, value: json[MQTT_PORT], fromConfig: defaultPort });
    dispatch({ type: json.scan ? WIFI_SCAN : WIFI_MANUAL });
  }

  function getConfig() {
    dispatch({ type: FETCHING_CONFIG });

    ajax("/config.json", "GET", null, function(text) {
      updateFromConfig(JSON.parse(text));
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

  function buildParam(key, value) {
    return key + "=" + encodeURIComponent(value);
  }

  function onSave(event) {
    event.preventDefault();

    var data = {};
    var ap = null;
    var wifi = state.wifi;

    if(wifi.scan) {
      ap = wifi.ap.scan;
    } else {
      ap = wifi.ap.manual;
    }

    data[SSID] = ap.ssid;
    if(!wifi.scan) {
      data[ENCRYPTION] = ap.encryption;
    }

    if(ap.encryption != ENCRYPTION_NONE) {
      data[PASSKEY] = wifi.passkey.value;
    }

    var mqtt = state.mqtt;
    var tls = mqtt.tls.value;

    data[MQTT_DEVICE_NAME] = mqtt.deviceName.value;
    data[MQTT_SERVER] = mqtt.server.value;
    data[MQTT_PORT] = mqtt.port.value.toString();

    data[MQTT_TLS] = tls ? "1" : "0";
    data[MQTT_FINGERPRINT] = mqtt.fingerprint.value;

    data[MQTT_AUTH_MODE] = mqtt.authMode;
    data[MQTT_USERNAME] = mqtt.username.value;
    data[MQTT_PASSWORD] = mqtt.password.value;
    data[MQTT_CERT] = mqtt.certificate.value;
    data[MQTT_CERT_KEY] = mqtt.secretKey.value;

    dispatch({ type: SAVING });
    
    ajax("/save", "POST", JSON.stringify(data), function() {
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

  addEventListener(getElementById(SSID), CHANGE, changeScanAP);
  addEventListener(getElementById(SSID_MANUAL), INPUT, changeEvent(CHANGE_MANUAL_AP));
  addEventListener(getElementById(PASSKEY), INPUT, changeEvent(CHANGE_PASSKEY));
  addEventListener(getElementById(MQTT_DEVICE_NAME), INPUT, changeEvent(CHANGE_MQTT_DEVICE_NAME));
  addEventListener(getElementById(MQTT_SERVER), INPUT, changeEvent(CHANGE_MQTT_SERVER));
  addEventListener(getElementById(MQTT_PORT), INPUT, changeEvent(CHANGE_MQTT_PORT));
  addEventListener(getElementById(MQTT_USERNAME), INPUT, changeEvent(CHANGE_MQTT_USERNAME));
  addEventListener(getElementById(MQTT_PASSWORD), INPUT, changeEvent(CHANGE_MQTT_PASSWORD));
  addEventListener(getElementById(MQTT_CERT), INPUT, changeEvent(CHANGE_MQTT_CERT));
  addEventListener(getElementById(MQTT_CERT_KEY), INPUT, changeEvent(CHANGE_MQTT_CERT_KEY));
  addEventListener(getElementById(MQTT_FINGERPRINT), INPUT, changeEvent(CHANGE_MQTT_FINGERPRINT));

  addEventListener(getElementById('scan-network'), CLICK, clickEvent(WIFI_SCAN));
  addEventListener(getElementById('manual-network'), CLICK, clickEvent(WIFI_MANUAL));
  addEventListener(getElementById(ENCRYPTION), CHANGE, changeEvent(CHANGE_ENCRYPTION));

  addEventListener(getElementById(MQTT_TLS), CHANGE, changeCheckboxEvent(CHANGE_MQTT_TLS));
  addEventListener(getElementById('mqttAuthMode-none'), CHANGE, changeEvent(CHANGE_MQTT_AUTH_MODE));
  addEventListener(getElementById('mqttAuthMode-username'), CHANGE, changeEvent(CHANGE_MQTT_AUTH_MODE));
  addEventListener(getElementById('mqttAuthMode-certificate'), CHANGE, changeEvent(CHANGE_MQTT_AUTH_MODE));

  addEventListener(getElementById('form'), 'submit', onSave);

  // Run reduce once with no action to initialise the state
  state = reduce(state, { type: null });
  getConfig();
  browse();
})();
