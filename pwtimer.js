const http = require('http'),
      fs = require('fs'),
      request = require('request'),
      interval_names = require('./intervals'),
      redis = require('redis').createClient();

const SITES = {
  prod: 'personatestuser.org',
  stage: 'resutsetanosrep.org'
};

const AUDIENCE = "https%3A%2F%2Fjed.gov";
const TEN_MINUTES = 10 * 60 * 1000;

/*
 * email with assertion is known as "email a la mode" in some circles.
 */
var testEmailWithAssertion = module.exports.testEmailWithAssertion = function testEmailWithAssertion(site, uri, callback) {
  var addr = 'http://' + ([SITES[site], uri, AUDIENCE]).join('/');
  request.get({method: 'GET', uri: addr}, function(err, res, body) {
    if (err) return callback("Error GETting " + addr + ": " + err.toString());
    try {
      return callback(null, JSON.parse(body));
    } catch (err) {
      console.log("weird response:", body);
      return callback(err);
    }
  });
};

/*
 * personatestuser should cancel accounts automatically after an hour.
 * But let's be good citizens and not count on that.
 */
var cancelAccount = function cancelAccount(site, data, callback) {
  var addr = 'http://' + ([SITES[site], 'cancel', data.email, data.pass]).join('/');
  request.get({method: 'GET', uri: addr}, function(err, res, body) {
    if (typeof callback === 'function') {
      if (err) return callback("Error GETting " + addr + ": " + err.toString());
      return callback(null, body);
    }
  });
};

/*
 * Convert a list of tuples to a dictionary.  This obviously assumes
 * that the first item in any tuple is unique among all tuples.  Which
 * in the case of the event stream, it is.
 */
var tuplesToDict = function tuplesToDict(tuples) {
  var d = {};
  tuples.forEach(function(tuple) {
    d[tuple[0]] = tuple[1];
  });
  return d;
};

/*
 * Extract timings from an event stream.
 */
var getIntervals = function getIntervals(uri, data) {
  var eventDict = tuplesToDict(data.events.stream);
  var headings = ["date"];
  var times = [data.events.start];
  interval_names[uri].forEach(function(interval) {
    var name = interval[0];
    var start = interval[1][0];
    var end = interval[1][1];

    headings.push(name);
    times.push(eventDict[end] - eventDict[start]);
  });
  return {headings: headings, times: times};
};

/*
 * Store the intervals in redis.  Only keep data from the past 30 days.
 */
var storeIntervals = function storeIntervals(intervals) {
  var one_month_ago = 30 * 24 * 60 * 60 * 1000;
  console.log(intervals.times);
  redis.zremrangebyscore('pwt:intervals:'+site, -Infinity, one_month_ago);

  // stash the interval data and the headings
  redis.zadd('pwt:intervals:'+site, intervals.times[0], intervals.times.join(','));
  redis.set('pwt:headings:'+site, intervals.headings.join(','));

};

var runOnce = function runOnce(site, uri, callback) {
  testEmailWithAssertion(site, uri, function(err, data) {
    if (err) {
      console.log("ERROR:", err);
      if (data && data.email && data.pass) {
        cancelAccount(site, data);
      }
      return callback(err);
    }
    try {
      var intervals = getIntervals(uri, data);
      storeIntervals(intervals);
      cancelAccount(site, data);
    } catch (err) {
      console.log("ERROR:", err);
    }
  });
};

if (!module.parent) {
  var site = 'prod';
  var uri = 'email_with_assertion';

  runOnce(site, uri, console.log);
  setInterval(function() { runOnce(site, uri, console.log); }, TEN_MINUTES);
}
