import { DataTypes, Op } from 'sequelize'

export default (sequelize) => {
  const organization = sequelize.define(
    'organization',
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
      website: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      url: {
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
      github: {
        type: DataTypes.JSONB,
        default: {},
      },
      twitter: {
        type: DataTypes.JSONB,
        default: {},
      },
      linkedin: {
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
      isTeamOrganization: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
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
      size: {
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
          unique: true,
          fields: ['importHash', 'tenantId'],
          where: {
            deletedAt: null,
          },
        },
        {
          fields: ['url', 'tenantId'],
          unique: true,
          where: {
            deletedAt: null,
            url: { [Op.ne]: null },
          },
        },
        {
          fields: ['name', 'tenantId'],
          unique: true,
          where: {
            deletedAt: null,
          },
        },
      ],
      timestamps: true,
      paranoid: true,
    },
  )

  organization.associate = (models) => {
    models.organization.belongsToMany(models.member, {
      as: 'members',
      through: 'memberOrganizations',
      foreignKey: 'organizationId',
    })

    models.organization.belongsTo(models.tenant, {
      as: 'tenant',
      foreignKey: {
        allowNull: false,
      },
    })

    models.organization.belongsTo(models.user, {
      as: 'createdBy',
    })

    models.organization.belongsTo(models.user, {
      as: 'updatedBy',
    })
  }

  return organization
}
