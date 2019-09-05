import validate from "validate.js";

const hostnameConstraints = {
  exclusion: {
    within: ["yahoo.com", "socket.io"]
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
    message: "^Invalid parameters"
  }
};

export const filterConstraints = {
  inclusion: {
    within: ["createdAt", "favorites"],
    message: "^Only support 'createdAt' or 'favorites' values"
  }
};
