
import { Router,Request,Response } from "express";
import z from "zod";
import { prisma } from "../lib/prisma";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { authenticate, AuthenticatedRequest } from "../middleware/Authenticate";
export const userRouter=Router();
dotenv.config()
const JWT_SECRET=process.env.JWT_SECRET!;
const UserSignup_SignInSchema=z.object({
    username:z.email('Invalid email format'),
    password:z.string().min(4,"Password must be at least 4 characters ").max(10,'Password must be at most 10 characters')
})
userRouter.post('/signup',async(req:Request,res:Response)=>{
const {username,password}=req.body;
const {success}=UserSignup_SignInSchema.safeParse({username,password})
if(!success){
    return res.json({message:'Error while validating user input'}).status(400)
}
try {
 const existingUser=await prisma.user.findUnique({
    where:{username:username}
 })
 if(existingUser) return res.json({message:'user already exist'}).status(409)  
    //hashing password
const hashedPassword=await bcrypt.hash(password,10) 
    const user=await prisma.user.create({
    data:{username,password:hashedPassword,usd_balance:5000},
    select:{id:true,username:true}
})
const token =jwt.sign({id:user.id,username:user.username},JWT_SECRET,{expiresIn:'1h'})
  return res.json({message:'user Created successfully', token:token}).status(200)
} catch (error) {
   console.log('Error while Signing Up ',error) ;
   return res.json({message:'Error while Signing Up'});
}

})
userRouter.post('/signin', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // 1. Validate input
  const { success } = UserSignup_SignInSchema.safeParse({ username, password });
  if (!success) {
    return res.status(400).json({ message: 'Error while validating user input' });
  }

  try {
    // 2. Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { username: username },
    });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Compare password with hashed password
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Generate token
    const token = jwt.sign(
      { id: existingUser.id, username: existingUser.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'Signin successful', token });
  } catch (error) {
    console.log('Error while Signing In', error);
    return res.status(500).json({ message: 'Error while Signing In' });
  }
});
userRouter.get('/balance',authenticate,async(req:AuthenticatedRequest,res:Response)=>{
 //getting user id 
 const userID=Number(req.userId);
 if(!userID)return res.status(411).json({message:'userID required'})
  const user =await prisma.user.findUnique({where:{id:userID},select:{usd_balance:true}});
  if (!user) return res.status(404).json({ message: "User not found" });
return res.json({usd_balance:user?.usd_balance})

})