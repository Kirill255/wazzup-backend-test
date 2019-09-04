import validate from "validate.js";

const blockedDomains = ["yahoo.com", "socket.io"];

const hostnameConstraints = {
  exclusion: {
    within: blockedDomains
  }
};

validate.validators.urlConstraints = function(value, options) {
  const constraints = { url: true };
  if (options) {
    constraints.presence = true;
  }

  if (validate.single(value, constraints)) {
    return {
      code: "BOOKMARKS_INVALID_LINK",
      description: "Invalid link"
    };
  }

  const { hostname } = new URL(value);
  if (validate.single(hostname, hostnameConstraints)) {
    return {
      code: "BOOKMARKS_BLOCKED_DOMAIN",
      description: `${hostname} banned`
    };
  }
};

const guidRegexp = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const guidConstraints = {
  format: {
    pattern: guidRegexp,
    flags: "i",
    message: "is invalid parameter"
  }
};
