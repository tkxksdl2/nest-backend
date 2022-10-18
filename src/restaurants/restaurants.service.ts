import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PAGINATION_UNIT } from 'src/common/common.constants';
import { User } from 'src/users/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { Category } from './entities/category.entity';
import { Dish } from './entities/dish.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    private readonly categories: CategoryRepository,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      newRestaurant.category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      await this.restaurants.save(newRestaurant);
      return { ok: true };
    } catch (error) {
      console.log(error);
      return {
        ok: false,
        error: 'Could not crate restaurant',
      };
    }
  }

  /** Check restaurant existance and if onwerId and restaurantId are same */
  async canEditRestaurant(owner: User, restaurantId: number) {
    const restaurant = await this.restaurants.findOne({
      where: { id: restaurantId },
      loadRelationIds: true,
    });
    if (!restaurant) {
      return {
        ok: false,
        error: 'Restaurant Not Found',
      };
    }
    if (owner.id !== restaurant.ownerId) {
      return {
        ok: false,
        error: "You can't edit a restaurant that you don't own",
      };
    }
    return { ok: true };
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const { ok, error } = await this.canEditRestaurant(
        owner,
        editRestaurantInput.restaurantId,
      );
      if (ok === false && error) {
        return { ok, error };
      }
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      }
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not edit Restaurant',
      };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const { ok, error } = await this.canEditRestaurant(owner, restaurantId);
      if (ok === false && error) {
        return { ok, error };
      }
      await this.restaurants.delete(restaurantId);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not delete Restaurant',
      };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResult] = await this.restaurants.findAndCount({
        relations: ['category'],
        take: PAGINATION_UNIT,
        skip: (page - 1) * PAGINATION_UNIT,
        order: {
          isPromoted: 'DESC',
        },
      });
      return {
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(totalResult / PAGINATION_UNIT),
        totalResult,
      };
    } catch {
      return { ok: false, error: 'Could not load Restaurants' };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not Found',
        };
      }
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not get Restaurant',
      };
    }
  }

  async searchRestaurantByName({
    page,
    query,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResult] = await this.restaurants.findAndCount({
        where: {
          name: ILike(`%${query}%`),
        },
        take: PAGINATION_UNIT,
        skip: (page - 1) * PAGINATION_UNIT,
      });
      return {
        ok: true,
        restaurants,
        totalPages: Math.ceil(totalResult / PAGINATION_UNIT),
        totalResult,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not Search Restaurant',
      };
    }
  }

  /** Count all Restaurants in category */
  countRestaurant(category: Category) {
    return this.restaurants.count({
      where: { category: { id: category.id } },
    });
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load Categories',
      };
    }
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({
        where: { slug },
      });
      if (!category) {
        return { ok: false, error: 'Category not found' };
      }
      const restaurants = await this.restaurants.find({
        where: {
          category: { id: category.id },
        },
        take: PAGINATION_UNIT,
        skip: (page - 1) * PAGINATION_UNIT,
        order: {
          isPromoted: 'DESC',
        },
      });
      const totalResult = await this.countRestaurant(category);
      return {
        ok: true,
        category,
        restaurants,
        totalPages: Math.ceil(totalResult / PAGINATION_UNIT),
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load Category',
      };
    }
  }

  async createDish(
    owner: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: createDishInput.restaurantId },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't create menu on retaurant that you don't own",
        };
      }
      const dish = await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant }),
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not create Dish' };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: editDishInput.dishId },
        relations: ['restaurant'],
      });
      if (!dish) {
        return { ok: false, error: 'Dish not found.' };
      }
      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't edit menu on retaurant that you don't own",
        };
      }
      await this.dishes.save(
        this.dishes.create({ id: editDishInput.dishId, ...editDishInput }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not edit menu',
      };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: dishId },
        relations: ['restaurant'],
      });
      if (!dish) {
        return { ok: false, error: 'Dish not found.' };
      }
      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't delete menu on retaurant that you don't own",
        };
      }
      await this.dishes.delete(dishId);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not delete menu',
      };
    }
  }
}
