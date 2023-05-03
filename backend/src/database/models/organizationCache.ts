import { DataTypes, Op } from 'sequelize'

export default (sequelize) => {
  const organizationCache = sequelize.define(
    'organizationCache',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      parentUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emails: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        default: [],
      },
      phoneNumbers: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        default: [],
      },
      logo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        default: [],
      },
      twitter: {
        type: DataTypes.JSONB,
        default: {},
      },
      linkedin: {
        type: DataTypes.JSONB,
        default: {},
      },
      github: {
        type: DataTypes.JSONB,
        default: {},
      },
      crunchbase: {
        type: DataTypes.JSONB,
        default: {},
      },
      employees: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      revenueRange: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      importHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          len: [0, 255],
        },
      },
      location: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      website: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      founded: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      industry: {
        type: DataTypes.TEXT,
        allowNull: true,
        default: '',
      },
      naics: {
        type: DataTypes.ARRAY(DataTypes.JSONB),
        allowNull: true,
        default: [],
      },
      profiles: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        default: [],
      },
      headline: {
        type: DataTypes.TEXT,
        allowNull: true,
        default: '',
      },
      ticker: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      employeeCountByCountry: {
        type: DataTypes.JSONB,
        allowNull: true,
        default: {},
      },
      lastEnrichedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        {
          fields: ['url'],
          unique: true,
          where: {
            deletedAt: null,
            url: { [Op.ne]: null },
          },
        },
      ],
      timestamps: true,
      paranoid: true,
    },
  )

  return organizationCache
}
