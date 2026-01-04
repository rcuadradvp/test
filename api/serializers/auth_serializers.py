# api/serializers/auth_serializers.py

from rest_framework import serializers
from api.models import User, Company, Role
from api.authentication.password_handler import PasswordHandler

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'rut', 
                  'phone', 'company', 'role', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User(**validated_data)
        user.password = PasswordHandler.hash_password(password)
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.display_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'rut',
                  'phone', 'role', 'role_name', 'company', 'company_name',
                  'is_active', 'created_at', 'last_login']
        read_only_fields = ['id', 'created_at']