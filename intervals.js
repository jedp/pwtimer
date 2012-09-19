/*
 * Names of intervals to measure in the event stream, with the two
 * events that bracket the interval.
 */
module.exports = {
  "email_with_assertion": [
    ["session_context", [
      "GET /wsapi/session_context", "/wsapi/session_context returned 200"]],
    ["address_info", [
      "GET /wsapi/address_info", "/wsapi/address_info returned 200"]],
    ["stage_user", [
      "POST /wsapi/stage_user", "/wsapi/stage_user returned 200"]],
    ["email arrives", [
      "/wsapi/stage_user returned 200", "email with verification url received"]],
    ["complete_user_creation", [
      "POST /wsapi/complete_user_creation", "/wsapi/complete_user_creation returned 200"]],
    ["authenticate_user", [
      "POST /wsapi/authenticate_user", "/wsapi/authenticate_user returned 200"]],
    ["cert_key", [
      "POST /wsapi/cert_key", "/wsapi/cert_key returned 200"]],
    ["total_time", [
      "GET /wsapi/session_context", "/wsapi/cert_key returned 200"]]
  ]
};
