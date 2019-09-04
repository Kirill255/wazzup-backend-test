import { Router } from "express";
import validate from "validate.js";
import { Op } from "sequelize";

import { guidConstraints } from "../../validators/bookmarks";
import models from "../../models";

const router = Router();

router.get("/", async (req, res) => {
  console.log("!!!req.query!!!, ", req.query);
  const limit = req.query.limit || 50;
  const offset = req.query.offset || 0;
  const filter = req.query.filter || null;
  const filter_value = !!req.query.filter_value || null;
  const filter_from = req.query.filter_from || "";
  const filter_to = req.query.filter_to || "";
  const sort_by = req.query.sort_by || "createdAt";
  const sort_dir = req.query.sort_dir || "asc";

  try {
    let bookmarks;
    if (filter && filter_value) {
      bookmarks = await models.bookmarks.findAll({
        where: {
          [Op.or]: [{ [filter]: filter_value }, { [filter]: { [Op.between]: [filter_from, filter_to] } }]
        },
        limit,
        offset,
        order: [[sort_by, sort_dir]]
      });
    } else {
      bookmarks = await models.bookmarks.findAll({});
    }

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

  if (validate.isDefined(req.body.description) && validate.isString(req.body.description)) {
    res.status(400).json({ errors: { backend: ["Bookmark description must be of type string"] } });
    return;
  }

  if (validate.isDefined(req.body.favorites) && validate.isBoolean(req.body.favorites)) {
    res.status(400).json({ errors: { backend: ["Bookmark favorites must be of type boolean"] } });
    return;
  }

  try {
    const bookmark = await models.bookmarks.create({
      link: req.body.link,
      description: req.body.description,
      favorites: req.body.favorites,
      createdAt: new Date(),
      updatedAt: new Date()
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
  updatedValues.updatedAt = new Date(); // or Date.now() ?

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

export default router;
