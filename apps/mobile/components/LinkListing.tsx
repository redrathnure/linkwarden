import { View, Text, Image, Pressable, Platform, Alert } from "react-native";
import { decode } from "html-entities";
import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { ArchivedFormat } from "@linkwarden/types";
import {
  atLeastOneFormatAvailable,
  formatAvailable,
} from "@linkwarden/lib/formatStats";
import useAuthStore from "@/store/auth";
import { useRouter } from "expo-router";
import * as ContextMenu from "zeego/context-menu";
import { useDeleteLink } from "@linkwarden/router/links";
import { SheetManager } from "react-native-actions-sheet";
import * as Clipboard from "expo-clipboard";
import { cn } from "@linkwarden/lib/utils";

type Props = {
  link: LinkIncludingShortenedCollectionAndTags;
  dashboard?: boolean;
};

const LinkListing = ({ link, dashboard }: Props) => {
  const { auth } = useAuthStore();
  const router = useRouter();

  const deleteLink = useDeleteLink(auth);

  let shortendURL;

  try {
    if (link.url) {
      shortendURL = new URL(link.url).host.toLowerCase();
    }
  } catch (error) {
    console.log(error);
  }

  return (
    <ContextMenu.Root
      onOpenChange={() => {
        /* track open/close if needed */
      }}
    >
      <ContextMenu.Trigger asChild>
        <Pressable
          className={cn(
            "p-5 flex-row justify-between bg-white",
            Platform.OS === "android"
              ? "active:bg-white"
              : "active:bg-gray-200",
            dashboard && "rounded-xl"
          )}
          onPress={() => router.push(`/links/${link.id}`)}
          android_ripple={{ color: "#ddd", borderless: false }}
        >
          <View
            className={cn(
              "flex-row justify-between",
              dashboard ? "w-80" : "w-full"
            )}
          >
            <View className="w-[65%] flex-col justify-between">
              <Text numberOfLines={2} className="font-medium text-lg">
                {decode(link.name || link.description || link.url)}
              </Text>

              {shortendURL && (
                <Text numberOfLines={1} className="mt-1.5 font-light text-sm">
                  {shortendURL}
                </Text>
              )}

              <View className="flex flex-row gap-1 items-center mt-1.5 pr-1.5 self-start rounded-md">
                <IconSymbol
                  name="folder.fill"
                  size={16}
                  color={link.collection.color || ""}
                />
                <Text numberOfLines={1} className="font-light text-xs">
                  {link.collection.name}
                </Text>
              </View>
            </View>

            <View className="flex-col items-end">
              <View className="rounded-lg overflow-hidden relative">
                {formatAvailable(link, "preview") ? (
                  <Image
                    source={{
                      uri: `${auth.instance}/api/v1/archives/${link.id}?format=${ArchivedFormat.jpeg}&preview=true&updatedAt=${link.updatedAt}`,
                      headers: {
                        Authorization: `Bearer ${auth.session}`,
                      },
                    }}
                    className="rounded-md h-[60px] w-[90px] object-cover scale-105"
                  />
                ) : (
                  <View className="h-[60px] w-[90px]" />
                )}
              </View>
              <View className="flex flex-row gap-1 items-center mt-5 self-start">
                <IconSymbol name="calendar" size={16} color="gray" />
                <Text numberOfLines={1} className="font-light text-xs">
                  {new Date(link.createdAt as string).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </ContextMenu.Trigger>

      <ContextMenu.Content avoidCollisions>
        <ContextMenu.Item
          key="open-link"
          onSelect={() => router.push(`/links/${link.id}`)}
        >
          <ContextMenu.ItemTitle>Open Link</ContextMenu.ItemTitle>
        </ContextMenu.Item>

        {link.url && (
          <ContextMenu.Item
            key="copy-url"
            onSelect={async () => {
              await Clipboard.setStringAsync(link.url as string);
            }}
          >
            <ContextMenu.ItemTitle>Copy URL</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        )}

        <ContextMenu.Item
          key="edit-link"
          onSelect={() => {
            SheetManager.show("edit-link-sheet", {
              payload: { link: link },
            });
          }}
        >
          <ContextMenu.ItemTitle>Edit Link</ContextMenu.ItemTitle>
        </ContextMenu.Item>

        {link.url && atLeastOneFormatAvailable(link) && (
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger key="preserved-formats">
              <ContextMenu.ItemTitle>Preserved Formats</ContextMenu.ItemTitle>
            </ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
              {formatAvailable(link, "monolith") && (
                <ContextMenu.Item
                  key="preserved-formats-webpage"
                  onSelect={() =>
                    router.push(
                      `/links/${link.id}?format=${ArchivedFormat.monolith}`
                    )
                  }
                >
                  <ContextMenu.ItemTitle>Webpage</ContextMenu.ItemTitle>
                </ContextMenu.Item>
              )}
              {formatAvailable(link, "image") && (
                <ContextMenu.Item
                  key="preserved-formats-screenshot"
                  onSelect={() =>
                    router.push(
                      `/links/${link.id}?format=${
                        link.image?.endsWith(".png")
                          ? ArchivedFormat.png
                          : ArchivedFormat.jpeg
                      }`
                    )
                  }
                >
                  <ContextMenu.ItemTitle>Screenshot</ContextMenu.ItemTitle>
                </ContextMenu.Item>
              )}
              {formatAvailable(link, "pdf") && (
                <ContextMenu.Item
                  key="preserved-formats-pdf"
                  onSelect={() =>
                    router.push(
                      `/links/${link.id}?format=${ArchivedFormat.pdf}`
                    )
                  }
                >
                  <ContextMenu.ItemTitle>PDF</ContextMenu.ItemTitle>
                </ContextMenu.Item>
              )}
              {formatAvailable(link, "readable") && (
                <ContextMenu.Item
                  key="preserved-formats-readable"
                  onSelect={() =>
                    router.push(
                      `/links/${link.id}?format=${ArchivedFormat.readability}`
                    )
                  }
                >
                  <ContextMenu.ItemTitle>Readable</ContextMenu.ItemTitle>
                </ContextMenu.Item>
              )}
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
        )}

        <ContextMenu.Item
          key="delete-link"
          onSelect={() => {
            return Alert.alert(
              "Delete Link",
              "Are you sure you want to delete this link? This action cannot be undone.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    deleteLink.mutate(link.id as number);
                  },
                },
              ]
            );
          }}
        >
          <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};

export default LinkListing;
