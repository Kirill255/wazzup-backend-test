import { Router } from "express";
import validate from "validate.js";
import { Op } from "sequelize";
import request from "request";
import { promisify } from "util";

import { guidConstraints, filterConstraints } from "../../validators/bookmarks";
import models from "../../models";

const router = Router();
const rp = promisify(request);

router.get("/", async (req, res) => {
  console.log("!!!req.query!!!, ", req.query);

  const validationResult = validate(req.query, {
    filter: filterConstraints
    // filter_value: filterConstraints
  });

  if (validationResult) {
    res.status(400).json({ errors: validationResult });
    return;
  }

  const limit = req.query.limit || 50;
  const offset = req.query.offset || 0;
  let filter = req.query.filter;
  let filter_value = req.query.filter_value;
  let filter_from = req.query.filter_from;
  let filter_to = req.query.filter_to;
  const sort_by = req.query.sort_by || "createdAt";
  const sort_dir = req.query.sort_dir || "asc";

  console.log("11111filter_value, ", filter_value);
  console.log("11111filter_value, ", typeof filter_value);
  console.log("11111filter_from, ", typeof filter_from);
  console.log("11111filter_to, ", typeof filter_to);

  if (filter === "favorites") {
    if (validate.isDefined(filter_value)) {
      filter_value = filter_value === "true";
    } else {
      res.status(400).json({ errors: { backend: ["To filter by favorites, select a filter_value."] } });
      return;
    }
  }

  if (filter === "createdAt") {
    if ((validate.isDefined(filter_value) && !validate.isEmpty(filter_value)) || (validate.isDefined(filter_from) && validate.isDefined(filter_to))) {
      if (validate.isDefined(filter_value)) {
        filter_value = new Date(filter_value);
      }
      if (validate.isDefined(filter_from)) {
        filter_from = new Date(filter_from);
      }
      if (validate.isDefined(filter_to)) {
        filter_to = new Date(filter_to);
      }
    } else {
      res.status(400).json({ errors: { backend: ["To filter by createdAt, select a filter_value or filter_from and filter_to"] } });
      return;
    }
  }

  console.log("222222, ", filter_value);
  console.log("222222, ", typeof filter_value);
  console.log("222222, ", typeof filter_from);
  console.log("222222, ", typeof filter_to);

  const query = {
    where: {},
    limit,
    offset,
    order: [[sort_by, sort_dir]]
  };

  if (filter) {
    query.where[filter] = {};
    if (validate.isDefined(filter_value)) {
      query.where[filter][Op.eq] = filter_value;
    }
    if (validate.isDefined(filter_from) && validate.isDefined(filter_to)) {
      query.where[filter][Op.between] = [filter_from, filter_to];
    }
  }

  try {
    const bookmarks = await models.bookmarks.findAll(query);
    console.log("!!!bookmarks!!! ", bookmarks);
    res.json({
      length: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't get list of bookmarks", error] } });
  }
});

router.post("/", async (req, res) => {
  const validationResult = validate(req.body, {
    link: { urlConstraints: true }
  });

  if (validationResult) {
    res.status(400).json({ errors: validationResult.link });
    return;
  }

  if (!validate.isDefined(req.body.description) || !validate.isString(req.body.description)) {
    res.status(400).json({ errors: { backend: ["Bookmark description must be of type string"] } });
    return;
  }

  if (!validate.isDefined(req.body.favorites) || !validate.isBoolean(req.body.favorites)) {
    res.status(400).json({ errors: { backend: ["Bookmark favorites must be of type boolean"] } });
    return;
  }

  console.log(req.body.favorites);
  console.log(validate.isDefined(req.body.favorites));
  console.log(validate.isBoolean(req.body.favorites));
  console.log(typeof req.body.favorites);
  try {
    const bookmark = await models.bookmarks.create({
      link: req.body.link,
      description: req.body.description,
      favorites: req.body.favorites,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    res.status(201).json({ data: { guid: bookmark.guid, createdAt: bookmark.createdAt } });
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't create bookmark", error] } });
  }
});

router.patch("/:guid", async (req, res) => {
  const guidValidationResult = validate(req.params, {
    guid: guidConstraints
  });

  if (guidValidationResult) {
    res.status(400).json({ errors: guidValidationResult });
    return;
  }

  const validationResult = validate(req.body, {
    link: { urlConstraints: false }
  });

  if (validationResult) {
    res.status(400).json({ errors: validationResult.link });
    return;
  }

  if (validate.isDefined(req.body.description) && !validate.isString(req.body.description)) {
    res.status(400).json({ errors: { backend: ["Bookmark description must be of type string"] } });
    return;
  }

  if (validate.isDefined(req.body.favorites) && !validate.isBoolean(req.body.favorites)) {
    res.status(400).json({ errors: { backend: ["Bookmark favorites must be of type boolean"] } });
    return;
  }

  const updatedValues = {};
  if (validate.isDefined(req.body.link)) {
    updatedValues.link = req.body.link;
  }
  if (validate.isDefined(req.body.description)) {
    updatedValues.description = req.body.description;
  }
  if (validate.isDefined(req.body.favorites)) {
    updatedValues.favorites = req.body.favorites;
  }
  updatedValues.updatedAt = Date.now(); // or Date.now() ?

  try {
    const updatedResult = await models.bookmarks.update(updatedValues, { where: { guid: req.params.guid } });

    console.log("!!!updatedResult!!! ", updatedResult);
    if (updatedResult[0] === 0) {
      res.status(404).json({ errors: { backend: ["Bookmark with that ID doesn't exist"] } });
      return;
    }

    res.status(200).json("Update were successful");
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't update bookmark", error] } });
  }
});

router.delete("/:guid", async (req, res) => {
  const guidValidationResult = validate(req.params, {
    guid: guidConstraints
  });

  if (guidValidationResult) {
    res.status(400).json({ errors: guidValidationResult });
    return;
  }

  try {
    const deletedResult = await models.bookmarks.destroy({ where: { guid: req.params.guid } });

    console.log("!!!deletedResult!!! ", deletedResult);
    if (deletedResult === 0) {
      res.status(404).json({ errors: { backend: ["Bookmark with that ID doesn't exist"] } });
      return;
    }

    res.status(200).json("Delete was successful");
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't delete bookmark", error] } });
  }
});

router.get("/:guid", async (req, res) => {
  const guidValidationResult = validate(req.params, {
    guid: guidConstraints
  });

  if (guidValidationResult) {
    res.status(400).json({ errors: guidValidationResult });
    return;
  }

  try {
    const bookmark = await models.bookmarks.findOne({ where: { guid: req.params.guid } });

    const WHOIS_URL = `http://htmlweb.ru/analiz/api.php?whois&url=${bookmark.link}&json`;

    const [{ body }, { body: whois }] = await Promise.all([
      rp(bookmark.link, { json: true }), //
      rp(WHOIS_URL, { json: true })
    ]);

    const title = body.match(/<title>(.*?)<\/title>/i)[1] || "Title placeholder";

    const imgRegexp = /<img\b(?=\s)(?=(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*?\ssrc=['"]([^"]*)['"]?)(?:[^>=]|='[^']*'|="[^"]*"|=[^'"\s]*)*"\s?\/?>/;
    const imgSrc = imgRegexp.exec(body)[1] || "https://via.placeholder.com/150";

    const preview = {
      "og:type": "website",
      "og:title": title,
      "og:image": imgSrc,
      "og:description": bookmark.description
    };

    res.json({
      data: {
        preview,
        whois
      }
    });
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't get bookmark info", error] } });
  }
});

export default router;
