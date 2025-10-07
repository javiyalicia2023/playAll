import { HttpException, HttpStatus } from '@nestjs/common';

export class StructuredHttpException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ code, message }, status);
  }
}

export class ForbiddenStructuredException extends StructuredHttpException {
  constructor(code: string, message: string) {
    super(HttpStatus.FORBIDDEN, code, message);
  }
}

export class NotFoundStructuredException extends StructuredHttpException {
  constructor(code: string, message: string) {
    super(HttpStatus.NOT_FOUND, code, message);
  }
}
