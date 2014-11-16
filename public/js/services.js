var $ = require('jquery');
var Waypoint = require('waypoints');
var socket = io();
var moment = require('moment');

var comment = $('#composer-message');

var MAX_LIMIT = 30;

exports.sendMessage = function (profile, rtc, next) {
  rtc.recordVideo(function (err, frames) {
    if (!err) {
      if (window.ga) {
        window.ga('send', 'event', 'message', 'send');
      }

      socket.emit('message', {
        message: comment.val(),
        media: frames,
        fingerprint: profile.fingerprint
      });
    }

    comment.val('');
    next();
  });
};

exports.getMessage = function (data, mutedFP, userIdManager, profile, messages) {
  if (window.ga) {
    window.ga('send', 'event', 'message', 'receive');
  }

  if (!mutedFP[data.fingerprint]) {
    var li = $('<li data-fp="' + data.fingerprint + '" />');

    var videoContainer = $('<div class="video-container"/>');
    var video = $('<video src="' + data.media + '" autoplay="autoplay" loop />');
    var convertButton = $('<a class="convert">Save as GIF</a>');
    videoContainer.append(video).append(convertButton);

    var created = moment(new Date(data.created));
    var time = $('<time datetime="' + created.toISOString() + '" class="timestamp">' +
      created.format('LT') + '</time>');

    var p = $('<p />');
    p.html(data.message);
    p.append(time);

    var userControls = '';
    if (!userIdManager.contains(data.fingerprint)) {
      userControls = '<button class="mute">mute</button>';
    }
    var actions = $('<div class="actions">' + userControls +'</div>');

    li.append(videoContainer).append(p).append(actions);
    messages.append(li);

    var waypoints = [];

    waypoints.push(new Waypoint({
      element: li[0],
      handler: function (direction) {
        $(this.element).toggleClass('in-view', direction === 'up');
        video[0][direction === 'up' ? 'play' : 'pause']();
      },
      offset: function () {
        return -$(this.element).outerHeight();
      }
    }));

    waypoints.push(new Waypoint({
      element: li[0],
      handler: function (direction) {
        $(this.element).toggleClass('in-view', direction === 'down');
        video[0][direction === 'down' ? 'play' : 'pause']();
      },
      offset: '100%'
    }));

    li.data('waypoints', waypoints);

    var children = messages.find('li');
    var size = $(window).innerHeight();
    var last = messages[0].lastChild;
    var bottom = last ? last.getBoundingClientRect().bottom : 0;
    var follow = bottom < size + 50;

    if (follow) {
      if (children.length > MAX_LIMIT) {
        children.slice(0, children.length - MAX_LIMIT).each(function () {
          $(this).data('waypoints').forEach(function (waypoint) {
            waypoint.destroy();
          });
          var saveLink = $(this).find('.save');
          if (saveLink.length) {
            window.URL.revokeObjectURL(saveLink.attr('href'));
          }
        }).remove();
        Waypoint.refreshAll();
      }

      li[0].scrollIntoView();
    }
  }
};
