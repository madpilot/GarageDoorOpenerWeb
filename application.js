(function() {
  // Constants
  // Minify will turn these in to short variables
  var FETCH_APS = 1;
  var FETCHING_APS = 2;
  var FETCHED_APS = 3;
  var CHANGE_AP = 4;
  var CHANGE_PASSKEY = 5;
  var CHANGE_DEVICE_NAME = 6;
  var NOT_SCANNED = 7;
  var SCANNING = 8;
  var SCANNING_COMPLETE = 9;
  var SAVING = 10;
  var CONNECTED = 11;
  var CONNECTION_ERROR = 12;
  var FETCHED_CONFIG = 13;
  var WIFI_AUTOMATIC = 14;
  var WIFI_MANUAL = 15;

  // Initial State
  var state = {
    wifi: {
      ui: {
        scan: true,
        security: {
          changed: false,
          valid: true,
          error: null,
          value: 0
        },
        passkey: {
          changed: false,
          valid: false,
          error: null,
          value: ''
        }
      },
      aps: [],
      ap: null,
      error: '',
      connection: NOT_SCANNED
    },
    mqtt: {
      ui: {
        server: {
          changed: false,
          valid: false,
          error: null,
          value: ''
        },
        port: {
          changed: false,
          valid: false,
          error: null,
          value: 1883
        }
      },
      tls: false,
      authenticate: false
    }
  };

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

  // Reducers
  function reduce_wifi_aps(state, action) {
    if(action.type == SCANNING_COMPLETE) {
      return action.aps;
    }

    return state;
  }

  function reduce_wifi_ap(state, action) {
    switch(action.type) {
    case SCANNING_COMPLETE:
      if(action.aps.length == 0) {
        return null;
      } else {
        return assign({}, action.aps[0]);
      }

    case CHANGE_AP:
      return assign({}, action.ap);
    }

    return state;
  }

  function reduce_wifi_ui_scan(state, action) {
    switch(action.type) {
      case WIFI_AUTOMATIC:
        return true;
      case WIFI_MANUAL:
        return false;
    };
    return state;
  }

  function reduce_wifi_ui_passkey(state, action) {
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

  function reduce_wifi_ui_deviceName(state, action) {
    if(action.type == CHANGE_DEVICE_NAME) {
      var value = action.value;
      var valid = value.length > 0 && value.length <= 64;

      return assign({}, state, {
        value: action.value,
        valid: valid,
        changed: true
      });
    } else if(action.type == FETCHED_CONFIG) {
      var value = action.config.deviceName;
      var valid = value.length > 0 && value.length <= 64;

      return assign({}, state, {
        value: value,
        valid: valid,
        changed: value != ""
      });
    }

    return state;
  }

  function reduce_wifi_error(state, action) {
    if(action.type == CONNECTION_ERROR) {
      return action.message
    }
    
    return state;
  }

  function reduce_wifi_connection(state, action) {
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

  function dispatch(action) {
    var oldState = assign({}, state);
    state = assign({}, oldState);
    var wifi = assign({}, state.wifi);
    var wifi_ui = assign({}, wifi.ui)

    wifi_ui.scan = reduce_wifi_ui_scan(wifi_ui.scan, action);
    wifi_ui.passkey = reduce_wifi_ui_passkey(wifi_ui.passkey, action);
    wifi_ui.deviceName = reduce_wifi_ui_deviceName(wifi_ui.deviceName, action);

    wifi.error = reduce_wifi_error(wifi.error, action);
    wifi.ap = reduce_wifi_ap(wifi.ap, action);
    wifi.aps = reduce_wifi_aps(wifi.aps, action);
    wifi.connection = reduce_wifi_connection(wifi.connection, action);

    wifi.ui = wifi_ui;
    state.wifi = wifi;

    render(state, oldState);
  }

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

  function render_ssid_enabled(state, old) {
    if(state.wifi.connection === old.wifi.connection) return;

    var ssid = getElementById('ssid');
    switch(state.wifi.connection) {
      case NOT_SCANNED:
      case SCANNING:
        disable(ssid);
        break;
      default:
        enable(ssid);
    }
  }

  function render_ssid_aps(state, old) {
    if(state.wifi.connection === old.wifi.connection && state.wifi.aps === old.wifi.aps && state.wifi.ap === old.wifi.ap) return;

    var ssid = getElementById('ssid');
    var aps = state.wifi.aps;
    var connection = state.wifi.connection;
    var selected = state.wifi.ap;

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
  }

  function render_passkey_value(state, old) {
    if(state.wifi.ui.passkey.value === old.wifi.ui.passkey.value) return;

    var passkey = getElementById('passkey');
    passkey.value = state.wifi.ui.passkey.value;
  }

  function render_passkey_visible(state, old) {
    var encrypted = state.wifi.ap ? state.wifi.ap.encryption : null;
    var oldEncrypted = old.wifi.ap ? old.ap.wifi.encryption : null;

    var same = state.wifi.ui.passkey.value === old.wifi.ui.passkey.value;
    same = same && encrypted === oldEncrypted;

    if(same) return;

    var passkey = getElementById('passkey-wrapper');

    if(encrypted == 7) {
      hide(passkey);
    } else {
      show(passkey);
    }
  }

  function render_passkey_error(state, old) {
    var same = state.wifi.ui.passkey.changed === old.wifi.ui.passkey.changed;
    same = same && state.wifi.ui.passkey.valid === old.wifi.ui.passkey.valid;
    same = same && state.wifi.ui.passkey.value === old.wifi.ui.passkey.value;

    if(same) return;
    var value = state.wifi.ui.passkey.value;

    var passkeyError = getElementById('passkey-error');
    if(state.wifi.ui.passkey.changed && !state.wifi.ui.passkey.valid) {
      if(value.length == 0) {
        innerHTML(passkeyError, 'is required');
      } else if(value.length >= 32) {
        innerHTML(passkeyError, 'is too long');
      }
      show(passkeyError);
    } else {
      hide(passkeyError);
    }
  }

  function render_button_disabled(state, old) {
    var encryption = state.wifi.ap ? state.wifi.ap.encryption : null;
    var oldEncryption = old.wifi.ap ? old.wifi.ap.encryption: null;

    var same = state.wifi.ui.passkey.valid === old.wifi.ui.passkey.valid;
    same = same && state.wifi.connection === old.wifi.connection;
    same = same && encryption === oldEncryption;

    if(same) return;

    var button = getElementById('button');

    if(state.wifi.connection === SCANNING_COMPLETE && (encryption === 7 || state.wifi.ui.passkey.valid)) {
      enable(button);
    } else {
      disable(button);
    }
  }

  function render_button_value(state, old) {
    if(state.wifi.connection === old.wifi.connection) return;

    var button = getElementById('button');
    if(state.wifi.connection === SAVING) {
      innerHTML(button, "Connecting...");
    } else {
      innerHTML(button, "Connect");
    }
  }

  function render_notification(state, old) {
    if(state.wifi.connection === old.wifi.connection) return;

    var notification = getElementById('notification');
    if(state.wifi.connection === CONNECTED) {
      show(notification);
    } else {
      hide(notification);
    }
  }

  function render_error(state, old) {
    if(state.wifi.connection === old.wifi.connection) return;

    var error = getElementById('error');
    if(state.wifi.connection === CONNECTION_ERROR) {
      error.innerHTML = state.error;
      show(error);
    } else {
      hide(error);
    }
  }

  // Can a function for each element - if the returned dom representation is different
  // to the current dom representation, update the element
  function render(state, old) {
    render_ssid_enabled(state, old);
    render_ssid_aps(state, old);
    render_passkey_value(state, old);
    render_passkey_visible(state, old);
    render_passkey_error(state, old);
    render_button_disabled(state, old);
    render_button_value(state, old);
    render_notification(state, old);
    render_error(state, old);
  }

  function browse() {
    dispatch({ type: SCANNING });

    ajax("/browse.json", "GET", null, function(text) {
      dispatch({ type: SCANNING_COMPLETE, aps: JSON.parse(text) });
    });
  }

  function changeAP(event) {
    event.preventDefault();

    var ap = null;
    var aps = state.aps;
    for(var i = 0; i < aps.length; i++) {
      if(aps[i].ssid == event.target.value) {
        ap = aps[i];
      }
    }

    dispatch({
      type: CHANGE_AP,
      ap: ap
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

    var ssid = state.ap.ssid;
    var passkey = state.ui.passkey.value;

    var data = "ssid=" + ssid;
    if(state.ap.encryption != 7) {
      data += "&passkey=" + passkey;
    }

    dispatch({ type: SAVING });

    ajax("/save", "POST", data, function() {
      dispatch({ type: CONNECTED });
    }, function(message) {
      dispatch({ type: CONNECTION_ERROR, message: message });
    });
  }

  getElementById('ssid').addEventListener('change', changeAP, true);
  getElementById('passkey').addEventListener('input', changePasskey, true);
  getElementById('form').addEventListener('submit', onSave, true);

  browse();
})();
