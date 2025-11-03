import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CartEntity, CartStatuses } from '../entities/cart.entity';
import { CartItemEntity } from '../entities/cart-item.entity';
import { PutCartPayload } from 'src/order/type';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CartEntity | null> {
    return this.cartRepository.findOne({
      where: { user_id: userId },
      relations: ['items'],
    });
  }

  async createByUserId(user_id: string): Promise<CartEntity> {
    const cart = this.cartRepository.create({
      user_id,
      status: CartStatuses.OPEN,
    });

    return this.cartRepository.save(cart);
  }

  async findOrCreateByUserId(userId: string): Promise<CartEntity> {
    let existing = await this.findByUserId(userId);
    if (!existing) {
      existing = await this.createByUserId(userId);
    }

    return existing;
  }

  async updateByUserId(
    userId: string,
    payload: PutCartPayload,
  ): Promise<CartEntity> {
    const cart = await this.findOrCreateByUserId(userId);

    let existingItem = cart.items.find(
      (i) => i.product_id === payload.product.id,
    );

    if (!existingItem && payload.count > 0) {
      existingItem = this.cartItemRepository.create({
        product_id: payload.product.id,
        count: payload.count,
        cart,
      });
      await this.cartItemRepository.save(existingItem);
    } else if (existingItem && payload.count === 0) {
      await this.cartItemRepository.delete(existingItem.id);
    } else if (existingItem) {
      existingItem.count = payload.count;
      await this.cartItemRepository.save(existingItem);
    }

    return this.findByUserId(userId);
  }

  async removeByUserId(userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);
    if (cart) {
      await this.cartRepository.delete(cart.id);
    }
  }
}
