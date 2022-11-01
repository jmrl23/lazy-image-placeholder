import { createServer } from 'http'
import axios from 'axios'
import sharp from 'sharp'
import express, { NextFunction } from 'express'
import { HttpError, BadRequestError } from 'express-response-errors'
import type { Request, Response } from 'express'

const app = express()

app.use(
  express.urlencoded({ extended: false }),
  async function (request: Request, response: Response, next: NextFunction) {
    const { src: source } = request.query
    if (typeof source !== 'string') return next(new BadRequestError('No source'))
    if (!source.startsWith('http')) return next(new BadRequestError('Invalid source URL'))
    try {
      const data = await (await axios.get(source, { responseType: 'arraybuffer' })).data
      const buffer = await sharp(data).resize(1, 1).toBuffer()
      const result = `data:image/gif;base64,${buffer.toString('base64')}`
      response.end(result)
    } catch (error) {
      if (error instanceof Error) return next(new BadRequestError(error.message))
      response.status(400).end('Bad Request')
    }
  },
  function (
    error: HttpError,
    _request: Request,
    response: Response,
    done: NextFunction | undefined
  ) {
    if (!(error instanceof HttpError)) {
      return response.status(500).end('Internal Server Error')
    }
    const { code: statusCode, message, name } = error
    response
      .status(statusCode)
      .json({
        statusCode,
        message,
        error: name
          .replace(/([A-Z])/g, ' $1')
          .replace(/Error$/, '')
          .trim()
      })
  }
)

createServer(app)
  .listen(parseInt(process.env.PORT || '3000', 10))