import { HeroModel } from "../models/hero.model";
import { CreateHeroInput } from "../schemas/hero.schema";

export interface HeroQuery {
  primaryAttribute?: string;
  attackType?: string;
  sort?: string;
  page?: string | number;
  limit?: string | number;
}

export const heroStorage = {
  getAll: async (queryParams: HeroQuery = {}) => {
    const { primaryAttribute, attackType, sort, page, limit } = queryParams;

    const query: any = {};
    if (primaryAttribute) query.primaryAttribute = primaryAttribute;
    if (attackType) query.attackType = attackType;

    const pageNumber = parseInt(page as string, 10) || 1;
    const pageSize = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const sortBy = sort ? (sort as string).split(",").join(" ") : "-createdAt";

    const [data, total] = await Promise.all([
      HeroModel.find(query).sort(sortBy).skip(skip).limit(pageSize),
      HeroModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
      },
    };
  },

  getById: async (id: string) => await HeroModel.findById(id),
  create: async (data: CreateHeroInput) => await HeroModel.create(data),
  update: async (id: string, data: Partial<CreateHeroInput>) =>
    await HeroModel.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    }),
  remove: async (id: string) => await HeroModel.findByIdAndDelete(id),
};
