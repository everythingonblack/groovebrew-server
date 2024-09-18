const { Cafe, Item, ItemType } = require("../models");
const multer = require("multer");
const path = require("path");
const itemtype = require("../models/itemtype");

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5 MB file size limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (extname && mimeType) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpeg, jpg, png)."));
    }
  },
}).single("image");

// Controller methods

// Create a new item
exports.createItem = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { stock, name, description, price, itemTypeId } = req.body;
    const image = req.file ? req.file.path : null;
    console.log(req.body);
    console.log(req.cafe.cafeId);

    try {
      const newItem = await Item.create({
        stock,
        itemTypeId,
        cafeId: req.cafe.cafeId,
        name,
        description,
        image,
        price,
      });
      console.log(newItem);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create item" });
    }
  });
};

// Get all items for a specific cafeId
exports.getItems = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const items = await Item.findAll({
      where: { cafeId },
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve items" });
  }
};

// Get an item by ID
exports.getItemById = async (req, res) => {
  const { itemId } = req.params;

  try {
    const item = await Item.findByPk(itemId);
    if (item) {
      res.status(200).json(item);
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve item" });
  }
};

// Update an item
exports.updateItem = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { itemId } = req.params;
    const { stock, name, description } = req.body;
    const image = req.file ? req.file.path : null;

    try {
      const item = await Item.findByPk(itemId);
      if (item) {
        item.stock = stock;
        item.name = name;
        item.description = description;
        if (image) item.image = image;

        await item.save();
        res.status(200).json(item);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });
};

// Delete an item
exports.deleteItem = async (req, res) => {
  const { itemId } = req.params;

  try {
    const item = await Item.findByPk(itemId);
    if (item) {
      await item.destroy();
      res.status(200).json({ message: "Item deleted" });
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
};

exports.getItemType = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const type = await ItemType.findAll({ where: { cafeId: cafeId } });

    res.status(201).json(type);
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createItemType = async (req, res) => {
  const { name } = req.body;

  try {
    const type = await ItemType.create({ name, cafeId: req.cafe.cafeId });

    res.status(201).json(type);
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createItemType = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { name } = req.body;
    const image = req.file ? req.file.path : null;

    try {
      const newItemType = await ItemType.create({
        name,
        cafeId: req.cafe.cafeId,
        image,
      });
      console.log(newItemType);
      res.status(201).json(newItemType);
    } catch (error) {
      console.error("Failed to create item type:", error);
      res.status(500).json({ error: "Failed to create itemType" });
    }
  });
};

exports.updateItemType = async (req, res) => {
  const { itemTypeId } = req.params;
  const { newName } = req.body;

  try {
    const type = await ItemType.findByPk(itemTypeId);
    type.name = newName;
    await type.save();
    res.status(201).json(type);
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.setAvailability = async (req, res) => {
  const { itemId } = req.params;
  const { isAvailable } = req.body;

  try {
    const item = await Item.findByPk(itemId);
    item.availability = isAvailable;
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteItemType = async (req, res) => {
  const { itemTypeId } = req.params;

  try {
    const type = await ItemType.findByPk(itemTypeId);

    if (type) {
      await type.destroy();
      res.status(200).json({ message: "Item deleted" });
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getItemTypesWithItems = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const cafe = await Cafe.findByPk(cafeId);
    if (!cafe) return res.status(404).json({ error: "Cafe not found" });

    const itemTypes = await ItemType.findAll({
      where: { cafeId },
      include: [
        {
          model: Item,
          as: "itemList",
        },
      ],
    });

    res.status(200).json({ cafe: cafe, data: itemTypes });
  } catch (error) {
    console.error("Error fetching item types with items:", error);
    res.status(500).json({ error: "Failed to retrieve item types with items" });
  }
};

exports.getCartDetails = async (req, res) => {
  const { cafeId } = req.params;
  const cartItems = req.body; // Expecting an array of objects with itemId and qty

  try {
    // Extract itemIds from cartItems
    const itemIds = cartItems.map((item) => item.itemId);

    // Fetch items from the database
    const items = await Item.findAll({
      where: {
        itemId: itemIds,
        cafeId: cafeId,
      },
      include: {
        model: ItemType,
        attributes: ["itemTypeId", "name"],
      },
    });

    // Group items by their type
    const itemTypesMap = items.reduce((acc, item) => {
      const itemTypeId = item.ItemType.itemTypeId;
      if (!acc[itemTypeId]) {
        acc[itemTypeId] = {
          itemTypeId: item.ItemType.itemTypeId,
          cafeId: item.cafeId,
          typeName: item.ItemType.name,
          // imageUrl: item.ItemType.imageUrl,
          itemList: [],
        };
      }
      acc[itemTypeId].itemList.push({
        itemId: item.itemId,
        price: item.price,
        name: item.name,
        image: item.image,
        qty: cartItems.find((cartItem) => cartItem.itemId === item.itemId).qty,
      });
      return acc;
    }, {});

    // Convert map to array
    const itemTypes = Object.values(itemTypesMap);

    res.status(200).json(itemTypes);
  } catch (error) {
    console.error("Error fetching cart details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
