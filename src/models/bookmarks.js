'use strict';
module.exports = (sequelize, DataTypes) => {
  var bookmarks = sequelize.define('bookmarks', {
    guid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    link: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      // defaultValue: DataTypes.NOW // defaultValue или allowNull?
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    favorites: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
  }, {
    timestamps: false
  });

  return bookmarks;
};