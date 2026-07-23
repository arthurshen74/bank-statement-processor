using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using System.Runtime.Serialization;
using System.Reflection;

namespace Backend.Common;

public class EnumMemberSerializer<TEnum> : SerializerBase<TEnum>
    where TEnum : struct, Enum
{
    public override void Serialize(BsonSerializationContext context,
        BsonSerializationArgs args, TEnum value)
    {
        var field = typeof(TEnum).GetField(value.ToString());
        var attr = field?.GetCustomAttribute<EnumMemberAttribute>();
        var stringValue = attr?.Value ?? value.ToString();
        context.Writer.WriteString(stringValue);
    }

    public override TEnum Deserialize(BsonDeserializationContext context,
        BsonDeserializationArgs args)
    {
        var stringValue = context.Reader.ReadString();

        foreach (var field in typeof(TEnum).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            var attr = field.GetCustomAttribute<EnumMemberAttribute>();
            if (attr?.Value == stringValue || field.Name == stringValue)
            {
                return (TEnum)field.GetValue(null)!;
            }
        }

        throw new BsonSerializationException(
            $"Cannot deserialize '{stringValue}' to {typeof(TEnum).Name}");
    }
}