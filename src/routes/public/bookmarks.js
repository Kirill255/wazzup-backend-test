import { Router } from "express";
import validate from "validate.js";
import { Op } from "sequelize";
import request from "request";
import { promisify } from "util";

import { limitConstraints, offsetConstraints } from "../../validators/basic";
import { guidConstraints, filterConstraints, sortByConstraints, sortDirConstraints } from "../../validators/bookmarks";
import models from "../../models";

const router = Router();
const requestPromisify = promisify(request);

/**
 * @api {get} /api/v1/bookmarks
 * @apiDescription Получение списка всех закладок или списка закладок с учётом фильтров
 */
router.get("/", async (req, res) => {
  const validationResult = validate(req.query, {
    limit: limitConstraints,
    offset: offsetConstraints,
    filter: filterConstraints,
    sort_by: sortByConstraints,
    sort_dir: sortDirConstraints
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
    const bookmarks = await models.bookmarks.findAndCountAll(query);

    res.json({
      length: bookmarks.count,
      data: bookmarks.rows
    });
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't get list of bookmarks", error] } });
  }
});

/**
 * @api {post} /api/v1/bookmarks
 * @apiDescription Создание закладки
 */
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

/**
 * @api {patch} /api/v1/bookmarks/:guid
 * @apiDescription Изменение закладки
 */
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
  updatedValues.updatedAt = Date.now();

  try {
    const updatedResult = await models.bookmarks.update(updatedValues, { where: { guid: req.params.guid } });

    if (updatedResult[0] === 0) {
      res.status(404).json({ errors: { backend: ["Bookmark with that ID doesn't exist"] } });
      return;
    }

    res.status(200).json("Update were successful");
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't update bookmark", error] } });
  }
});

/**
 * @api {delete} /api/v1/bookmarks/:guid
 * @apiDescription Удаление закладки
 */
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

    if (deletedResult === 0) {
      res.status(404).json({ errors: { backend: ["Bookmark with that ID doesn't exist"] } });
      return;
    }

    res.status(200).json("Delete was successful");
  } catch (error) {
    res.status(400).json({ errors: { backend: ["Can't delete bookmark", error] } });
  }
});

/**
 * @api {get} /api/v1/bookmarks/:guid
 * @apiDescription Получение информации о закладке
 */
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

    const { body, whois } = await getInfoByBookmarkLink(bookmark.link);

    const { title, imgSrc } = parseBody(body);

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

async function getInfoByBookmarkLink(link) {
  const WHOIS_URL = `http://htmlweb.ru/analiz/api.php?whois&url=${link}&json`;

  // насколько такая конструкция читабельна? или так лучше не писать?
  const [{ body }, { body: whois }] = await Promise.all([
    requestPromisify(link, { json: true }), //
    requestPromisify(WHOIS_URL, { json: true })
  ]);

  return { body, whois };
}

function parseBody(body) {
  const title = body.match(/<title>(.*?)<\/title>/i)[1] || "Title placeholder";

  const imgRegexp = /<img\b(?=\s)(?=(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*?\ssrc=['"]([^"]*)['"]?)(?:[^>=]|='[^']*'|="[^"]*"|=[^'"\s]*)*"\s?\/?>/;
  const imgSrc = imgRegexp.exec(body)[1] || "https://via.placeholder.com/150";

  return { title, imgSrc };
}
