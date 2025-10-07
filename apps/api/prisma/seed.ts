import { PrismaClient, RoomRole } from '@prisma/client';
import { adjectives, animals } from '../src/common/name-lists';

const prisma = new PrismaClient();

function randomName() {
  const adjective = adjectives[0];
  const animal = animals[0];
  return `${adjective}${animal}`;
}

async function main() {
  await prisma.queueItem.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.playbackState.deleteMany();
  await prisma.roomSettings.deleteMany();
  await prisma.room.deleteMany();
  await prisma.appUser.deleteMany();

  const host = await prisma.appUser.create({
    data: {
      displayName: 'HostLion'
    }
  });

  const guestA = await prisma.appUser.create({
    data: {
      displayName: 'GuestFox'
    }
  });

  const guestB = await prisma.appUser.create({
    data: {
      displayName: 'GuestOtter'
    }
  });

  const room = await prisma.room.create({
    data: {
      code: 'ABCDEF',
      hostUserId: host.id,
      members: {
        create: [
          { userId: host.id, role: RoomRole.HOST },
          { userId: guestA.id, role: RoomRole.GUEST },
          { userId: guestB.id, role: RoomRole.GUEST }
        ]
      },
      settings: {
        create: {
          allowGuestEnqueue: true,
          allowGuestSkipVote: false
        }
      },
      queue: {
        create: [
          {
            videoId: 'dQw4w9WgXcQ',
            title: 'Never Gonna Give You Up',
            durationSeconds: 213,
            addedById: host.id,
            position: 0
          }
        ]
      }
    },
    include: { settings: true }
  });

  console.log('Seeded room', room.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
