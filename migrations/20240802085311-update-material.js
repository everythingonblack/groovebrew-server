"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add new values to the ENUM type, handling duplicates
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Material_unit' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'kuintal')) THEN
            EXECUTE 'ALTER TYPE "enum_Material_unit" ADD VALUE ''kuintal''';
          END IF;
        END
        $$;
      `);

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Material_unit' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ons')) THEN
            EXECUTE 'ALTER TYPE "enum_Material_unit" ADD VALUE ''ons''';
          END IF;
        END
        $$;
      `);

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Material_unit' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gram')) THEN
            EXECUTE 'ALTER TYPE "enum_Material_unit" ADD VALUE ''gram''';
          END IF;
        END
        $$;
      `);

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Material_unit' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'meter')) THEN
            EXECUTE 'ALTER TYPE "enum_Material_unit" ADD VALUE ''meter''';
          END IF;
        END
        $$;
      `);

      // Add the new 'removed' column
      await queryInterface.addColumn("Material", "removed", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    } catch (error) {
      console.error("Error updating ENUM type:", error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the 'removed' column
    await queryInterface.removeColumn("Material", "removed");

    // Revert ENUM changes if necessary (manual intervention may be required)
    console.log(
      "To rollback, you may need to recreate the ENUM type excluding the new values."
    );
  },
};
