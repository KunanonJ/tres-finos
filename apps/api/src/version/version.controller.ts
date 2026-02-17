import { Controller, Get } from "@nestjs/common";

@Controller("v1")
export class VersionController {
  @Get()
  getVersion() {
    return {
      name: "tres-finos-api",
      version: "0.1.0",
      stage: "phase-0-foundation"
    };
  }
}
