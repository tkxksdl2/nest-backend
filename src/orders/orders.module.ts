import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderResolver } from './orders.resolver';
import { OrderServcie } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Restaurant, Dish])],
  providers: [OrderServcie, OrderResolver],
})
export class OrdersModule {}
