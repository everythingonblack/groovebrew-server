const { Table } = require("../models"); // Adjust path as necessary

// Function to generate a random string of lowercase alphabets
function generateRandomString(length) {
  const characters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to generate a unique table code in the format 'xxxxx-xxxxx-xxxxx'
async function generateUniqueTableCode(shopId) {
  let code;
  let isUnique = false;

  while (!isUnique) {
    // Generate a table code in the format 'xxxxx-xxxxx-xxxxx'
    code = `${generateRandomString(5)}-${generateRandomString(
      5
    )}-${generateRandomString(5)}`;

    // Check if the generated code already exists in the database
    const existingTable = await Table.findOne({
      where: {
        cafeId: shopId,
        tableCode: code,
      },
    });

    if (!existingTable) {
      isUnique = true; // Code is unique, exit the loop
    }
  }

  return code;
}

exports.createTable = async (req, res) => {
  const { newTable } = req.body;
  const cafeId = req.cafe.cafeId; // Use cafeId from the request

  try {
    // Generate a unique table code for the specified cafeId
    const tableCode = await generateUniqueTableCode(cafeId);

    const table = await Table.create({
      cafeId: cafeId,
      xposition: newTable.xposition,
      yposition: newTable.yposition,
      tableNo: newTable.tableNo,
      tableCode: tableCode,
    });

    return res.status(201).json(table);
  } catch (error) {
    console.error("Error creating table:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to update a table
exports.updateTable = async (req, res) => {
  const { tableId } = req.params;
  const { table } = req.body;

  try {
    const dbtable = await Table.findByPk(tableId);

    if (!dbtable) {
      return res.status(404).json({ error: "Table not found" });
    }
    console.log(table);
    dbtable.xposition = table.xposition;
    dbtable.yposition = table.yposition;
    dbtable.tableNo = table.tableNo;
    await dbtable.save();

    return res.status(200).json(dbtable);
  } catch (error) {
    console.error("Error updating table:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to get a specific table by tableNo
exports.getTable = async (req, res) => {
  const { cafeId } = req.params;
  const { tableNo } = req.query; // Use query parameters

  try {
    const table = await Table.findOne({ where: { cafeId, tableNo } });

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    return res.status(200).json(table);
  } catch (error) {
    console.error("Error fetching table:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to get all tables for a specific cafe with tableNo sorted in ascending order
exports.getTables = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const tables = await Table.findAll({
      where: { cafeId },
      order: [["tableNo", "ASC"]], // Sort by tableNo in ascending order
    });
    return res.status(200).json(tables);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to delete a table
exports.deleteTable = async (req, res) => {
  const { tableId } = req.params;

  try {
    const table = await Table.findByPk(tableId);

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    await table.destroy();
    return res.status(200).json({ message: "Table deleted successfully" });
  } catch (error) {
    console.error("Error deleting table:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
