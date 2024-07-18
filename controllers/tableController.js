const { Table } = require('../models');

// Controller to create a table
exports.createTable = async (req, res) => {
  const { xposition, yposition } = req.body;

  if (isNaN(xposition) || isNaN(yposition)) {
    return res.status(400).json({ error: 'Invalid xposition or yposition' });
  }

  const xPos = parseInt(xposition, 10);
  const yPos = parseInt(yposition, 10);

  try {
    const table = await Table.create({
      cafeId: req.cafe.cafeId,
      xposition: xPos,
      yposition: yPos
    });

    return res.status(201).json(table);
  } catch (error) {
    console.error('Error creating table:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller to update a table
exports.updateTable = async (req, res) => {
  const { tableId } = req.params;
  const { xposition, yposition } = req.body;

  if (isNaN(xposition) || isNaN(yposition)) {
    return res.status(400).json({ error: 'Invalid xposition or yposition' });
  }

  const xPos = parseInt(xposition, 10);
  const yPos = parseInt(yposition, 10);

  try {
    const table = await Table.findByPk(tableId);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    table.xposition = xPos;
    table.yposition = yPos;
    await table.save();

    return res.status(200).json(table);
  } catch (error) {
    console.error('Error updating table:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller to get a specific table by tableNo
exports.getTable = async (req, res) => {
  const { cafeId } = req.params;
  const { tableNo } = req.query; // Use query parameters

  try {
    const table = await Table.findOne({ where: { cafeId, tableNo } });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    return res.status(200).json(table);
  } catch (error) {
    console.error('Error fetching table:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Controller to get all tables for a specific cafe
exports.getTables = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const tables = await Table.findAll({ where: { cafeId } });
    return res.status(200).json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller to delete a table
exports.deleteTable = async (req, res) => {
  const { tableId } = req.params;

  try {
    const table = await Table.findByPk(tableId);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    await table.destroy();
    return res.status(200).json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
