import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CartService } from './services/cart.service';
import { OrderService, Order } from '../order';
import { CreateOrderDto, PutCartPayload } from 'src/order/type';
import { CartItemEntity } from './entities/cart-item.entity';
import { AppRequest } from '../shared';

const USER_ID = 'user-123';
const SAMPLE_PRODUCT = {
  title: 'Product',
  description: 'Description',
  price: 1000,
};

@Controller('api/profile/cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
  ) {}

  @Get()
  async getCartItems(): Promise<Array<CartItemEntity & { product: any }>> {
    const cart = await this.cartService.findOrCreateByUserId(USER_ID);

    return cart.items.map((item) => ({
      ...item,
      product: { ...SAMPLE_PRODUCT, id: item.product_id },
    }));
  }

  @Put()
  async modifyCart(
    @Body() payload: PutCartPayload,
  ): Promise<Array<CartItemEntity & { product: any }>> {
    const updatedCart = await this.cartService.updateByUserId(USER_ID, payload);

    return updatedCart.items.map((entry) => ({
      ...entry,
      product: { ...SAMPLE_PRODUCT, id: entry.product_id },
    }));
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async emptyCart(): Promise<void> {
    await this.cartService.removeByUserId(USER_ID);
  }

  @Put('order')
  async submitOrder(@Req() req: AppRequest, @Body() body: CreateOrderDto) {
    const cart = await this.cartService.findByUserId(USER_ID);

    if (!cart || !cart.items.length) {
      return { error: 'Cart is empty.' };
    }

    return {
      message: 'Order',
      cartId: cart.id,
      payload: body,
    };
  }

  @Get('order')
  fetchOrders(): Order[] {
    return this.orderService.getAll();
  }
}
