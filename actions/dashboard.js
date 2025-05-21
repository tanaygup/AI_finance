"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function CreaeAccount(data) {
  try {
    const { userId } = await auth();

    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) throw new Error("User not found in database");

    //   now user is there lets store him

    const balanceFLoat = parseFloat(data.balance);
    if (isNaN(balanceFLoat)) {
      throw new Error("Invalid balance");
    }

    const existingAccounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
    });

    const canDefault = existingAccounts.length === 0 ? true : data.isDefault;

    if (canDefault) {
      await db.account.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFLoat,
        userId: user.id,
        isDefault: canDefault,
      },
    });

    const serAcc = serializeTransaction(account);

    revalidatePath("/dashboard");

    return {
      success: true,
      data: serAcc,
    };
  } catch (err) {
    throw new Error(err.message);
  }
}
