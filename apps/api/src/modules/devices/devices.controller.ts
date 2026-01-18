import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  // @UseGuards(JwtAuthGuard)
  async getAllDevices() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  async getDevice(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Get(':id/jobs')
  async getDeviceJobs(@Param('id') id: string) {
    return this.devicesService.getDeviceJobs(id);
  }
}
