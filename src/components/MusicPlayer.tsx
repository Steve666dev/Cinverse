import { Play, SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BorderBeam } from "@/registry/magicui/border-beam";

export function MusicPlayer() {
  return (
    <Card className="relative w-[350px] overflow-hidden bg-neutral-950 border border-neutral-800 text-white shadow-2xl rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">Now Playing</CardTitle>
        <CardDescription className="text-sm text-neutral-400">Stairway to Heaven - Led Zeppelin</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-48 w-48 rounded-lg"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
            }}
          />
          <div className="h-1 w-full rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-white" />
          </div>
          <div className="flex w-full justify-between text-sm text-neutral-400">
            <span>2:45</span>
            <span>8:02</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full border-neutral-700 hover:bg-neutral-800 text-white">
          <SkipBack className="size-4" />
        </Button>
        <Button size="icon" className="rounded-full bg-white text-black hover:bg-neutral-200">
          <Play className="size-4 fill-current" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full border-neutral-700 hover:bg-neutral-800 text-white">
          <SkipForward className="size-4" />
        </Button>
      </CardFooter>
      <BorderBeam
        duration={6}
        size={400}
        className="from-transparent via-red-500 to-transparent"
      />
      <BorderBeam
        duration={6}
        delay={3}
        size={400}
        borderWidth={2}
        className="from-transparent via-blue-500 to-transparent"
      />
    </Card>
  );
}

export default MusicPlayer;

