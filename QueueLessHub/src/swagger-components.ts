/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *     Doctor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         specialty:
 *           type: string
 *         phone:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         client:
 *           type: string
 *         doctor:
 *           $ref: '#/components/schemas/Doctor'
 *         date:
 *           type: string
 *           format: date-time
 *     Availability:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         doctor:
 *           $ref: '#/components/schemas/Doctor'
 *         start:
 *           type: string
 *           format: date-time
 *         end:
 *           type: string
 *           format: date-time
 *     Client:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         from:
 *           type: string
 *         messages:
 *           type: array
 *           items:
 *             type: object
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         username:
 *           type: string
 */

export default {};
