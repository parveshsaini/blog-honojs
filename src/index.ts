import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign } from 'hono/jwt'

const app = new Hono<{
  //for ts to know DATABASE_URL is string (Hono specific feature)
  //note that these env variables are coming from wrangler.toml
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string
  }
}>()

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!')
})
// Using global variables in AWS Lambda (serverless) can lead to non-deterministic behaviors and subtle bugs 
// that are hard to track down and fix. This is due to the way AWS Lambda handles function instances and container reuse.
// Serverless functions may choose to run each invocation in a separate function instance, 
// each with its own copy of the global variable.

app.post('/signup', async (ctx)=>{
  //intitialize prisma client within the route because it is not a good practice to initialize it globally in serverless functions
  //environment variables are not available globally in serverless functions
  //you cannot use process.env.DATABASE_URL in serverless functions
  const prisma = new PrismaClient({
      datasourceUrl: ctx.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const body = await ctx.req.json()
  console.log("signup hit", body)

 try {
   const newUser= await prisma.user.create({
     data:{
       email: body.email,
       name: body.name,
       password: body.password
     }
   })

   console.log("user cration done", newUser)

   const token= await sign({
     id: newUser.id,
   }, ctx.env.JWT_SECRET)
 
   return ctx.json({
    message: 'user created',
    token: token
   })
 } catch (error: any) {
    return ctx.text('error while creating user', error)
  
 }
})

app.post('/login', async (ctx)=>{
  const prisma = new PrismaClient({
      datasourceUrl: ctx.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const body= await ctx.req.json()

  const user= await prisma.user.findUnique({
    where:{
      email: body.email
    }
  })

  if(!user) return ctx.json({message: 'user not found'})

  if(user.password !== body.password) return ctx.json({message: 'password incorrect'})

  const token= await sign({id: user.id}, ctx.env.JWT_SECRET)

  return ctx.json({
    message: 'login successful',
    token: token
  })


})

app.post('/blog', (ctx)=>{
  return ctx.text('blog')
})

app.put('/blog', (ctx)=>{
  return ctx.text('blog')
})

app.get('/blog/:id', (ctx)=>{
  const id= ctx.req.param('id')
  console.log(id)
  return ctx.text(`blog: ${id}`)
})

export default app
