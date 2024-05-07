import { prisma } from "@/lib/api/db";
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import isServerAdmin from "../../isServerAdmin";

const emailEnabled =
  process.env.EMAIL_FROM && process.env.EMAIL_SERVER ? true : false;
const stripeEnabled = process.env.STRIPE_SECRET_KEY ? true : false;

interface Data {
  response: string | object;
  status: number;
}

interface User {
  name: string;
  username?: string;
  email?: string;
  password: string;
}

export default async function postUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Data> {
  let isAdmin = await isServerAdmin({ req });

  if (process.env.NEXT_PUBLIC_DISABLE_REGISTRATION === "true" && !isAdmin) {
    return { response: "Registration is disabled.", status: 400 };
  }

  const body: User = req.body;

  const checkHasEmptyFields = emailEnabled
    ? !body.password || !body.name || !body.email
    : !body.username || !body.password || !body.name;

  if (!body.password || body.password.length < 8)
    return { response: "Password must be at least 8 characters.", status: 400 };

  if (checkHasEmptyFields)
    return { response: "Please fill out all the fields.", status: 400 };

  // Check email (if enabled)
  const checkEmail =
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  if (emailEnabled && !checkEmail.test(body.email?.toLowerCase() || ""))
    return { response: "Please enter a valid email.", status: 400 };

  // Check username (if email was disabled)
  const checkUsername = RegExp("^[a-z0-9_-]{3,31}$");
  if (!emailEnabled && !checkUsername.test(body.username?.toLowerCase() || ""))
    return {
      response:
        "Username has to be between 3-30 characters, no spaces and special characters are allowed.",
      status: 400,
    };

  const checkIfUserExists = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: body.email ? body.email.toLowerCase().trim() : undefined,
        },
        {
          username: body.username
            ? body.username.toLowerCase().trim()
            : undefined,
        },
      ],
    },
  });

  if (!checkIfUserExists) {
    const saltRounds = 10;

    const hashedPassword = bcrypt.hashSync(body.password, saltRounds);

    // Subscription dates
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1000); // end date is in 1000 years...

    if (isAdmin) {
      const user = await prisma.user.create({
        data: {
          name: body.name,
          username: (body.username as string).toLowerCase().trim(),
          email: emailEnabled ? body.email?.toLowerCase().trim() : undefined,
          password: hashedPassword,
          emailVerified: new Date(),
          subscriptions: stripeEnabled
            ? {
                create: {
                  stripeSubscriptionId:
                    "fake_sub_" + Math.round(Math.random() * 10000000000000),
                  active: true,
                  currentPeriodStart,
                  currentPeriodEnd,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          username: true,
          email: true,
          emailVerified: true,
          subscriptions: {
            select: {
              active: true,
            },
          },
          createdAt: true,
        },
      });

      return { response: user, status: 201 };
    } else {
      await prisma.user.create({
        data: {
          name: body.name,
          username: emailEnabled
            ? undefined
            : (body.username as string).toLowerCase().trim(),
          email: emailEnabled ? body.email?.toLowerCase().trim() : undefined,
          password: hashedPassword,
        },
      });

      return { response: "User successfully created.", status: 201 };
    }
  } else {
    return { response: "Email or Username already exists.", status: 400 };
  }
}
